import { DicomServiceError } from "../../common/dicomServiceError";
import { ErrorCodes, OperationStatus } from "../../common/enum";
import * as DicomUpload from "../dicomUpload";
import * as DicomUtils from '../../common/dicomUtils';
import * as fs from 'fs/promises';
import { createMockContext } from '@shopify/jest-koa-mocks';

jest.mock('uuid', () => ({ v4: () => 'file-id' }));

describe('dicomUpload', () => {

  afterAll(() => {
    jest.restoreAllMocks();
  })

  describe('validateFiles', () => {
    it("should throw an error on missing file details", () => {
      const files = {
        file2: [{ fileName: "file2" }]
      }

      try {
        //@ts-expect-error invalid types
        DicomUpload.validateFiles(files);
        throw new Error();
      } catch (err) {
        expect(err.code).toBeDefined;
        expect(err.code).toEqual(ErrorCodes.ERR_FILE_NOT_FOUND);
      }
    })

    it("should throw an error when multiple files are under one key", () => {
      const files = {
        file: [{ fileName: "file1" }, { fileName: "file2" }]
      }

      try {
        //@ts-expect-error invalid types
        DicomUpload.validateFiles(files);
        throw new Error();
      } catch (err) {
        expect(err.code).toBeDefined;
        expect(err.code).toEqual(ErrorCodes.ERR_MULTI_FILE_UNSUPPORTED);
      }
    })

    it("should throw error when multiple keys are found", () => {
      const files = {
        file: [{ fileName: "file1" }],
        file2: [{ fileName: "file2" }]
      }

      try {
        //@ts-expect-error invalid types
        DicomUpload.validateFiles(files);
        throw new Error();
      } catch (err) {
        expect(err.code).toBeDefined;
        expect(err.code).toEqual(ErrorCodes.ERR_MULTI_FILE_UNSUPPORTED);
      }
    })

    it("should pass validation", () => {
      const files = {
        file: { fileName: "file1" }
      }

      expect(() => {
        //@ts-expect-error invalid types
        DicomUpload.validateFiles(files)
      }).not.toThrow(DicomServiceError);
    })
  })

  describe('validateDicom', () => {
    it('should pass validation', () => {
      const currentDirectory = __dirname;
      jest.spyOn(DicomUtils, 'readFileData').mockImplementation(async (fileId) => {
        const fileData = await fs.readFile(`${currentDirectory}\\data\\${fileId}`);
        return fileData;
      });
      jest.spyOn(fs, "unlink").mockImplementation();

      expect(async () => {
        await DicomUpload.validateDicom("valid-dicom.DCM");
      }).not.toThrow(DicomServiceError);
    })

    it('should fail validation', async () => {
      const currentDirectory = __dirname;
      jest.spyOn(DicomUtils, 'readFileData').mockImplementation(async (fileId) => {
        const fileData = await fs.readFile(`${currentDirectory}\\data\\${fileId}`);
        return fileData;
      });
      jest.spyOn(fs, "unlink").mockImplementation();

      try {
        await DicomUpload.validateDicom("invalid-dicom.txt");
        throw new Error();
      } catch (err) {
        expect(err.code).toBeDefined;
        expect(err.code).toEqual(ErrorCodes.ERR_INVALID_DICOM);
      }
    })
  })

  it('should successfully upload a file', async () => {
    jest.spyOn(fs, "rename").mockImplementation();
    jest.spyOn(fs, "unlink").mockImplementation();
    jest.spyOn(DicomUpload, "validateDicom").mockImplementation();
    jest.spyOn(DicomUpload, "validateFiles").mockImplementation();

    const ctx = createMockContext();
    ctx.request.files = {
      file: {
        size: 100000,
        newFilename: 'new-file-name',
        hashAlgorithm: false,
        //@ts-expect-error type error
        toJSON: () => { return { newFileName: "new-file-name" } },
      }
    }
    await DicomUpload.handleUpload(ctx);

    expect(ctx.body).toEqual({
      fileId: "file-id",
      status: OperationStatus.SUCCESS
    });
    expect(ctx.status).toBe(201);
  })

  it('should fail to upload a file', async () => {
    jest.spyOn(fs, "rename").mockImplementation(() => { throw new Error() });
    jest.spyOn(fs, "unlink").mockImplementation();
    jest.spyOn(DicomUpload, "validateDicom").mockImplementation();
    jest.spyOn(DicomUpload, "validateFiles").mockImplementation();

    const ctx = createMockContext();
    ctx.request.files = {
      file: {
        size: 100000,
        newFilename: 'new-file-name',
        hashAlgorithm: false,
        //@ts-expect-error type error
        toJSON: () => { return { newFileName: "new-file-name" } },
      }
    }
    await DicomUpload.handleUpload(ctx);

    expect(ctx.body).toEqual({
      status: OperationStatus.ERROR,
      errorDetails: {
        code: "ERR_UPLOAD_FAILED",
        message: "Error encountered while uploading dicom file",
      }
    });
    expect(ctx.status).toBe(500);
  })
})