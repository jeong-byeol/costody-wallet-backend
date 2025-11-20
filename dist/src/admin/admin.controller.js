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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
const update_user_status_dto_1 = require("./dto/update-user-status.dto");
const get_transactions_dto_1 = require("./dto/get-transactions.dto");
const pause_omnibus_dto_1 = require("./dto/pause-omnibus.dto");
const cold_deposit_dto_1 = require("./dto/cold-deposit.dto");
const cold_move_dto_1 = require("./dto/cold-move.dto");
const approve_withdrawal_dto_1 = require("./dto/approve-withdrawal.dto");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getOmnibusBalance() {
        const data = await this.adminService.getOmnibusBalance();
        return {
            message: 'Omnibus 잔액 조회가 완료되었습니다.',
            data,
        };
    }
    async getColdBalance() {
        const data = await this.adminService.getColdBalance();
        return {
            message: 'Cold 잔액 조회가 완료되었습니다.',
            data,
        };
    }
    async getAllUsers() {
        const data = await this.adminService.getAllUsers();
        return {
            message: '유저 목록 조회가 완료되었습니다.',
            data,
        };
    }
    async updateUserStatus(dto) {
        const data = await this.adminService.updateUserStatus(dto.userId, dto.status);
        return {
            message: '유저 상태가 업데이트되었습니다.',
            data,
        };
    }
    async getOmnibusPausedStatus() {
        const data = await this.adminService.getOmnibusPausedStatus();
        return {
            message: 'Omnibus 지갑 상태 조회가 완료되었습니다.',
            data,
        };
    }
    async pauseOmnibus(dto) {
        const data = await this.adminService.pauseOmnibus(dto.paused);
        return {
            message: data.message,
            data,
        };
    }
    async coldDeposit(dto) {
        const data = await this.adminService.coldDeposit(dto.amountEth);
        return {
            message: 'Cold Vault 입금이 완료되었습니다.',
            data,
        };
    }
    async coldRequestMove(dto) {
        const data = await this.adminService.coldRequestMove(dto.amountEth);
        return {
            message: 'Cold Vault 이동 요청이 완료되었습니다.',
            data,
        };
    }
    async coldApproveMove(dto) {
        const data = await this.adminService.coldApproveMove(dto.moveId);
        return {
            message: 'Cold Vault 이동 승인이 완료되었습니다.',
            data,
        };
    }
    async coldExecuteMove(dto) {
        const data = await this.adminService.coldExecuteMove(dto.moveId);
        return {
            message: 'Cold Vault 이동 실행이 완료되었습니다.',
            data,
        };
    }
    async getDepositWithdrawTransactions(dto) {
        const data = await this.adminService.getDepositWithdrawTransactions(dto.limit);
        return {
            message: '입출금 기록 조회가 완료되었습니다.',
            data,
        };
    }
    async getPendingWithdrawalRequests(limit) {
        const limitNumber = limit ? Number(limit) : 50;
        const data = await this.adminService.getPendingWithdrawalRequests(limitNumber);
        return {
            message: '승인 대기 중인 출금 요청 목록 조회가 완료되었습니다.',
            data,
        };
    }
    async getWithdrawalRequestInfo(txId) {
        const data = await this.adminService.getWithdrawalRequestInfo(txId);
        return {
            message: '출금 요청 정보 조회가 완료되었습니다.',
            data,
        };
    }
    async approveWithdrawalRequest(dto) {
        const data = await this.adminService.approveWithdrawalRequest(dto.txId);
        return {
            message: '출금 요청이 승인되었습니다.',
            data,
        };
    }
    async executeWithdrawalRequest(dto) {
        const data = await this.adminService.executeWithdrawalRequest(dto.txId);
        return {
            message: '출금이 실행되었습니다.',
            data,
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('omnibus-balance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOmnibusBalance", null);
__decorate([
    (0, common_1.Get)('cold-balance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getColdBalance", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Patch)('users/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_user_status_dto_1.UpdateUserStatusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Get)('omnibus/paused'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getOmnibusPausedStatus", null);
__decorate([
    (0, common_1.Post)('omnibus/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pause_omnibus_dto_1.PauseOmnibusDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "pauseOmnibus", null);
__decorate([
    (0, common_1.Post)('cold/deposit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cold_deposit_dto_1.ColdDepositDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "coldDeposit", null);
__decorate([
    (0, common_1.Post)('cold/move/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cold_move_dto_1.ColdMoveRequestDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "coldRequestMove", null);
__decorate([
    (0, common_1.Post)('cold/move/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cold_move_dto_1.ColdMoveActionDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "coldApproveMove", null);
__decorate([
    (0, common_1.Post)('cold/move/execute'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cold_move_dto_1.ColdMoveActionDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "coldExecuteMove", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_transactions_dto_1.GetTransactionsDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDepositWithdrawTransactions", null);
__decorate([
    (0, common_1.Get)('withdrawals/pending'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPendingWithdrawalRequests", null);
__decorate([
    (0, common_1.Get)('withdrawals/:txId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('txId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getWithdrawalRequestInfo", null);
__decorate([
    (0, common_1.Post)('withdrawals/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [approve_withdrawal_dto_1.ApproveWithdrawalDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveWithdrawalRequest", null);
__decorate([
    (0, common_1.Post)('withdrawals/execute'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [approve_withdrawal_dto_1.ApproveWithdrawalDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "executeWithdrawalRequest", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map