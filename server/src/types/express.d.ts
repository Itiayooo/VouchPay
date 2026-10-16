import type { IVendorDocument } from '../modules/vendors/vendor.model';

declare global {
    namespace Express {
        interface Request {
            vendor?: IVendorDocument;
        }
    }
}

export { };