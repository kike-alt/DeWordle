import { Injectable } from '@nestjs/common';

@Injectable()
export class WordsService {
  test(): string {
    return 'OK';
  }
}
