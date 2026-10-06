package com.parking.platform.websocket;

import com.parking.platform.event.OccupancyChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OccupancyBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void onOccupancyChanged(OccupancyChangedEvent event) {
        messagingTemplate.convertAndSend("/topic/occupancy", event);
        if (event.zoneId() != null) {
            messagingTemplate.convertAndSend("/topic/zones/" + event.zoneId(), event);
        }
    }
}
