import { Controller, Get, Query } from '@nestjs/common';
import { AdminAuth } from '@/auth/decorators/roles.decorator';
import { OrderService } from '@/payments/shared/order.service';
import { BaseFilterDto } from '@/common/dto/filters.dto';

@Controller('admin/orders')
@AdminAuth()
export class AdminOrdersController {
	constructor(private readonly orderService: OrderService) {}

	@Get()
	async getOrders(
		@Query() pagination: BaseFilterDto,
		@Query('userId') userId?: string,
	) {
		return await this.orderService.getAllOrders({ userId, ...pagination });
	}
}
