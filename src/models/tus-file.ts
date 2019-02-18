export class TusFile {
  public id = this.fileId

  public createdAt = new Date()

  constructor(
    public fileId: string,
    public uploadLength: number,
    public uploadDeferLength: number,
    public uploadMetadata: string,
  ) {
    if (!fileId) {
      throw new Error('[TusFile] constructor must be given a fileId')
    }

    if (uploadLength === undefined && uploadDeferLength === undefined) {
      throw new Error('[TusFile] constructor must be given either a uploadLength or uploadDeferLength')
    }
  }

  /**
   *
   * @param period in seconds
   */
  getExpiredAt(period: number): Date {
    return new Date(new Date(this.createdAt).getTime() + period * 1000)
  }
}
