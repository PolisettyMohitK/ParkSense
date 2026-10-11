package com.parking.platform.websocket;

import com.parking.platform.event.OccupancyChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OccupancyBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;

    /** Fires after commit so clients never see a change that was rolled back. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onOccupancyChanged(OccupancyChangedEvent event) {
        messagingTemplate.convertAndSend("/topic/occupancy", event);
        if (event.zoneId() != null) {
            messagingTemplate.convertAndSend("/topic/zones/" + event.zoneId(), event);
        }
    }
}
