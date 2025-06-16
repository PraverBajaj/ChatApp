"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaClient = void 0;
const client_1 = require("@prisma/client");
exports.prismaClient = (_a = globalThis.prismaClient) !== null && _a !== void 0 ? _a : new client_1.PrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalThis.prismaClient = exports.prismaClient;
}
