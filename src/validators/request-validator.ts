/**
 * @fileOverview
 * Centralize all header validation in one place.
 *
 * @author Ben Stahl <bhstahl@gmail.com>
 */
import { HEADERS_LOWERCASE, TUS_RESUMABLE, TUS_VERSION } from '../constants'


export class RequestValidator {

    // All PATCH requests MUST include a Upload-Offset header
    static _invalidUploadOffsetHeader(value: string) {
        return isNaN(+value) || parseInt(value, 10) < 0;
    }

    // The value MUST be a non-negative integer.
    static _invalidUploadLengthHeader(value: string) {
        return isNaN(+value) || parseInt(value, 10) < 0;
    }

    // The Upload-Defer-Length value MUST be 1.
    static _invalidUploadDeferLengthHeader(value: string) {
        return isNaN(+value) || parseInt(value, 10) !== 1;
    }

    // The Upload-Metadata request and response header MUST consist of one
    // or more comma-separated key-value pairs. The key and value MUST be
    // separated by a space. The key MUST NOT contain spaces and commas and
    // MUST NOT be empty. The key SHOULD be ASCII encoded and the value MUST
    // be Base64 encoded. All keys MUST be unique.
    static _invalidUploadMetadataHeader(value: string) {
        const keypairs = value.split(',')
                              .map((keypair) => keypair.trim());

        return keypairs.some((keypair) => keypair.split(' ').length !== 2);
    }

    static _invalidTusVersionHeader(value: string) {
        return TUS_VERSION.indexOf(value) === -1;
    }

    static _invalidTusResumableHeader(value: string) {
        return value !== TUS_RESUMABLE;
    }


    // All PATCH requests MUST use Content-Type: application/offset+octet-stream.
    static _invalidContentTypeHeader(value: string) {
        return value !== 'application/offset+octet-stream';
    }


    static capitalizeHeader(header_name: string) {
        return header_name.replace(/\b[a-z]/g, function() {
            return arguments[0].toUpperCase();
        }).replace(/-/g, '');
    }

    static isInvalidHeader(this: any, header_name: string, header_value: string) {
        if (HEADERS_LOWERCASE.indexOf(header_name) === -1) {
            return false;
        }

        const method = `_invalid${this.capitalizeHeader(header_name)}Header`;
        return this[method](header_value);
    }
}
