import { Controller, Get, Post, Patch, Delete, Body, Headers, Param } from '@nestjs/common';
import { NotebookService } from './notebook.service';

@Controller('notebooks')
export class NotebookController {
  constructor(private readonly notebooks: NotebookService) {}

  @Get()
  async list(@Headers('x-clerk-user-id') clerkId: string) {
    console.log('[NotebookController] GET /notebooks clerkId=', clerkId);
    const result = await this.notebooks.list(clerkId);
    console.log('[NotebookController] returning', result.length, 'notebooks');
    return result;
  }

  @Post()
  create(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body()
    body: {
      name: string;
      themeId: string;
      silhouette: string;
      aiAccessible: boolean;
      thicknessId?: string;
    },
  ) {
    return this.notebooks.create(clerkId, body);
  }

  @Patch(':id')
  update(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; themeId?: string; thicknessId?: string },
  ) {
    return this.notebooks.update(clerkId, id, body);
  }

  @Delete(':id')
  delete(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('id') id: string,
  ) {
    return this.notebooks.delete(clerkId, id);
  }
}
