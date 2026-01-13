import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser } from '@/auth/auth.guard';
import { BaseFilterDto } from '@/common/dto/filters.dto';
import { OrderService } from '@/payments/shared/order.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { CreateOrderDto } from './dtos/create-order.dto';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
	constructor(private readonly orderService: OrderService) {}

	@Get()
	async getOrders(
		@Query() query: BaseFilterDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		// User: Own orders only
		return await this.orderService.getUserOrder(user.sub, query);
	}

	@Get(':id')
	async getOrder(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
		const order = await this.orderService.getOrderById(id);

		if (!order || order.userId !== user.sub) {
			throw new NotFoundException('Order not found');
		}

		return order;
	}

	@Post()
	async createOrder(
		@Body() dto: CreateOrderDto,
		@CurrentUser() user: JwtPayloadType,
	) {
		return await this.orderService.createOrder(user.sub, dto.bookIds);
	}
}
