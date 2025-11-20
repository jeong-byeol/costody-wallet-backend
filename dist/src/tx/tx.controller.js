"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TxController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxController = void 0;
const common_1 = require("@nestjs/common");
const tx_service_1 = require("./tx.service");
const deposit_dto_1 = require("./dto/deposit.dto");
const withdraw_submit_dto_1 = require("./dto/withdraw-submit.dto");
const withdraw_tx_dto_1 = require("./dto/withdraw-tx.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TxController = TxController_1 = class TxController {
    txService;
    logger = new common_1.Logger(TxController_1.name);
    constructor(txService) {
        this.txService = txService;
    }
    async deposit(req, depositDto) {
        const userId = req.user.id;
        const result = await this.txService.deposit(userId, depositDto.txHash);
        return {
            message: '입금이 완료되었습니다.',
            data: result,
        };
    }
    async withdrawSubmit(req, withdrawSubmitDto) {
        const email = req.user.email;
        this.logger.debug('withdraw/submit 요청 수신', {
            email,
            to: withdrawSubmitDto.to,
            amount: withdrawSubmitDto.amount,
        });
        const result = await this.txService.withdrawSubmit(email, withdrawSubmitDto.to, withdrawSubmitDto.amount, withdrawSubmitDto.password);
        return {
            message: '출금 요청이 생성되었습니다.',
            data: result,
        };
    }
    async withdrawApprove(withdrawTxDto) {
        const result = await this.txService.withdrawApprove(withdrawTxDto.txId);
        this.logger.debug('withdraw/approve 요청 수신', {
            txId: withdrawTxDto.txId,
        });
        return {
            message: '출금 요청이 승인되었습니다.',
            data: result,
        };
    }
    async withdrawExecute(req, withdrawTxDto) {
        const userId = req.user.id;
        const email = req.user.email;
        const result = await this.txService.withdrawExecute(withdrawTxDto.txId, userId, email);
        this.logger.debug('withdraw/execute 요청 수신', {
            txId: withdrawTxDto.txId,
        });
        return {
            message: '출금이 실행되었습니다.',
            data: result,
        };
    }
    async getTransactionHistory(req, direction) {
        const normalizedDirection = direction?.toUpperCase();
        if (normalizedDirection &&
            normalizedDirection !== 'IN' &&
            normalizedDirection !== 'OUT') {
            throw new common_1.BadRequestException('direction 파라미터가 올바르지 않습니다.');
        }
        const result = await this.txService.getTransactionHistory(req.user.id, normalizedDirection);
        return {
            message: '트랜잭션 기록을 조회했습니다.',
            data: result,
        };
    }
};
exports.TxController = TxController;
__decorate([
    (0, common_1.Post)('deposit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, deposit_dto_1.DepositDto]),
    __metadata("design:returntype", Promise)
], TxController.prototype, "deposit", null);
__decorate([
    (0, common_1.Post)('withdraw/submit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, withdraw_submit_dto_1.WithdrawSubmitDto]),
    __metadata("design:returntype", Promise)
], TxController.prototype, "withdrawSubmit", null);
__decorate([
    (0, common_1.Post)('withdraw/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [withdraw_tx_dto_1.WithdrawTxDto]),
    __metadata("design:returntype", Promise)
], TxController.prototype, "withdrawApprove", null);
__decorate([
    (0, common_1.Post)('withdraw/execute'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, withdraw_tx_dto_1.WithdrawTxDto]),
    __metadata("design:returntype", Promise)
], TxController.prototype, "withdrawExecute", null);
__decorate([
    (0, common_1.Get)('tx-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('direction')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TxController.prototype, "getTransactionHistory", null);
exports.TxController = TxController = TxController_1 = __decorate([
    (0, common_1.Controller)('tx'),
    __metadata("design:paramtypes", [tx_service_1.TxService])
], TxController);
//# sourceMappingURL=tx.controller.js.map