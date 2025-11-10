import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class WsGateway {
  @WebSocketServer()
  server!: Server;

  broadcastReservation(event: 'created' | 'updated' | 'cancelled', payload: any) {
    this.server.emit(`reservation.${event}`, payload);
  }

  broadcastTablesSnapshot(payload: any) {
    this.server.emit('tables.occupancy', payload);
  }

  broadcastTableOccupancyChange(payload: any) {
    this.server.emit('tables.occupancyChanged', payload);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: string) {
    return { pong: data ?? 'pong' };
  }
}

