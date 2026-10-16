import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';

export const register = asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    res.json({ success: true, data });
});

export const refresh = asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
    res.json({ success: true, data: { vendor: req.vendor } });
});

export const updateProfile = asyncHandler(async (req, res) => {
    const vendor = await authService.updateProfile(req.vendor!.id, req.body);
    res.json({ success: true, data: { vendor } });
});

export const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.vendor!.id);
    res.json({ success: true, message: 'Logged out' });
});