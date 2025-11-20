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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColdMoveActionDto = exports.ColdMoveRequestDto = void 0;
const class_validator_1 = require("class-validator");
class ColdMoveRequestDto {
    amountEth;
}
exports.ColdMoveRequestDto = ColdMoveRequestDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: '금액은 필수입니다.' }),
    (0, class_validator_1.IsString)({ message: '금액은 문자열이어야 합니다.' }),
    (0, class_validator_1.Matches)(/^\d+(\.\d+)?$/, { message: '금액은 숫자 형식이어야 합니다.' }),
    __metadata("design:type", String)
], ColdMoveRequestDto.prototype, "amountEth", void 0);
class ColdMoveActionDto {
    moveId;
}
exports.ColdMoveActionDto = ColdMoveActionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'moveId는 필수입니다.' }),
    (0, class_validator_1.IsString)({ message: 'moveId는 문자열이어야 합니다.' }),
    (0, class_validator_1.Matches)(/^0x[a-fA-F0-9]{64}$/, { message: 'moveId는 0x로 시작하는 64자리 hex 문자열이어야 합니다.' }),
    __metadata("design:type", String)
], ColdMoveActionDto.prototype, "moveId", void 0);
//# sourceMappingURL=cold-move.dto.js.map