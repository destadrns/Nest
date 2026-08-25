import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('families/:familyId/notifications')
@UseGuards(AuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async findAll(
    @Param('familyId') familyId: string,
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const notifications = await this.notificationService.findAllForUser(
      userId,
      familyId,
      unreadOnly === 'true',
    );
    const unreadCount = await this.notificationService.getUnreadCount(userId, familyId);
    return { data: notifications, meta: { unreadCount } };
  }

  @Patch(':id/read')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const notification = await this.notificationService.markAsRead(userId, id);
    return { data: notification };
  }

  @Patch('read-all')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Param('familyId') familyId: string, @CurrentUser('id') userId: string) {
    await this.notificationService.markAllAsRead(userId, familyId);
    return { data: { success: true } };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Delete notification' })
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.notificationService.delete(userId, id);
  }
}
