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
exports.SettingController = void 0;
const common_1 = require("@nestjs/common");
const setting_service_1 = require("./setting.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const update_whitelist_dto_1 = require("./dto/update-whitelist.dto");
const set_daily_limit_dto_1 = require("./dto/set-daily-limit.dto");
let SettingController = class SettingController {
    settingService;
    constructor(settingService) {
        this.settingService = settingService;
    }
    async registerWhitelist(req, dto) {
        const userId = req.user.id;
        const email = req.user.email;
        const result = await this.settingService.registerWhitelistAddress(userId, email, dto.to);
        return {
            message: '출금 화이트리스트 등록이 완료되었습니다.',
            data: result,
        };
    }
    async getWhitelist(req) {
        const userId = req.user.id;
        const list = await this.settingService.getWhitelistAddresses(userId);
        return {
            message: '출금 화이트리스트 목록을 조회했습니다.',
            data: list,
        };
    }
    async removeWhitelist(req, dto) {
        const userId = req.user.id;
        const email = req.user.email;
        const result = await this.settingService.removeWhitelistAddress(userId, email, dto.to);
        return {
            message: '출금 화이트리스트에서 주소가 제거되었습니다.',
            data: result,
        };
    }
    async setDailyLimit(req, dto) {
        const email = req.user.email;
        const result = await this.settingService.setUserDailyLimit(email, dto.maxEth);
        return {
            message: '일일 출금 한도가 설정되었습니다.',
            data: result,
        };
    }
    async getDailyLimit(req) {
        const email = req.user.email;
        const result = await this.settingService.getUserDailyLimit(email);
        return {
            message: '일일 출금 한도 정보를 조회했습니다.',
            data: result,
        };
    }
};
exports.SettingController = SettingController;
__decorate([
    (0, common_1.Post)('withdraw-whitelist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_whitelist_dto_1.UpdateWhitelistDto]),
    __metadata("design:returntype", Promise)
], SettingController.prototype, "registerWhitelist", null);
__decorate([
    (0, common_1.Get)('withdraw-whitelist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingController.prototype, "getWhitelist", null);
__decorate([
    (0, common_1.Delete)('withdraw-whitelist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_whitelist_dto_1.UpdateWhitelistDto]),
    __metadata("design:returntype", Promise)
], SettingController.prototype, "removeWhitelist", null);
__decorate([
    (0, common_1.Post)('daily-limit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, set_daily_limit_dto_1.SetDailyLimitDto]),
    __metadata("design:returntype", Promise)
], SettingController.prototype, "setDailyLimit", null);
__decorate([
    (0, common_1.Get)('daily-limit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingController.prototype, "getDailyLimit", null);
exports.SettingController = SettingController = __decorate([
    (0, common_1.Controller)('setting'),
    __metadata("design:paramtypes", [setting_service_1.SettingService])
], SettingController);
//# sourceMappingURL=setting.controller.js.map