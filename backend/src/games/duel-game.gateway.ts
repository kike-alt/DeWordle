import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JoinPayload {
  roomId: string;
  token: string;
}

interface GuessPayload {
  roomId: string;
  guess: string;
}

@WebSocketGateway({ namespace: 'duel' })
export class DuelGameGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join')
  handleJoin(@MessageBody() payload: JoinPayload, @ConnectedSocket() client: Socket): void {
    client.join(payload.roomId);
    this.server.to(payload.roomId).emit('opponent_joined', { roomId: payload.roomId });
  }

  @SubscribeMessage('guess')
  handleGuess(@MessageBody() payload: GuessPayload): void {
    this.server.to(payload.roomId).emit('opponent_guess', { guess: payload.guess });
  }

  @SubscribeMessage('match_end')
  handleMatchEnd(@MessageBody() payload: { roomId: string }): void {
    this.server.to(payload.roomId).emit('match_ended');
  }
}
