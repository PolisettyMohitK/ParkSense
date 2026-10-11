package com.parking.platform.config;

import com.parking.platform.security.CustomUserDetailsService;
import com.parking.platform.security.JwtService;
import com.parking.platform.security.SecurityConfig;
import com.parking.platform.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket for live occupancy. Clients must present their JWT in the CONNECT frame's
 * {@code Authorization} header, and may only subscribe - all broadcasts originate on the server.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final String BEARER = "Bearer ";

    private final String[] allowedOrigins;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public WebSocketConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins,
                           JwtService jwtService,
                           CustomUserDetailsService userDetailsService) {
        this.allowedOrigins = SecurityConfig.splitOrigins(allowedOrigins).toArray(String[]::new);
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }
                if (accessor.getCommand() == StompCommand.CONNECT) {
                    accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
                } else if (accessor.getCommand() == StompCommand.SEND) {
                    throw new MessageDeliveryException("Clients cannot publish to the broker");
                } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
                    String destination = accessor.getDestination();
                    if (destination == null || !destination.startsWith("/topic/")) {
                        throw new MessageDeliveryException("Unknown destination");
                    }
                }
                return message;
            }
        });
    }

    private UsernamePasswordAuthenticationToken authenticate(String header) {
        if (header == null || !header.startsWith(BEARER)) {
            throw new MessageDeliveryException("Missing bearer token");
        }
        String token = header.substring(BEARER.length());
        try {
            String email = jwtService.extractUsername(token);
            if (userDetailsService.loadUserByUsername(email) instanceof UserPrincipal principal
                    && principal.isEnabled() && jwtService.isTokenValid(token, principal)) {
                return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
            }
        } catch (RuntimeException ignored) {
            // fall through
        }
        throw new MessageDeliveryException("Invalid or expired token");
    }
}
