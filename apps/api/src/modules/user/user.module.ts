import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { UserService } from './user.service';
import { NotebookModule } from '../notebook/notebook.module';

@Module({
  imports:     [NotebookModule],
  controllers: [UserController, ClerkWebhookController],
  providers:   [UserService],
  exports:     [UserService],
})
export class UserModule {}
