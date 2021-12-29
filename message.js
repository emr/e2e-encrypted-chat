module.exports = class Message {
  /**
   * @param content {string}
   * @param from {User|undefined}
   * @param date {Date}
   * @param isEvent {boolean}
   * @param isFile {boolean}
   */
  constructor(content, from, date, isEvent = undefined, isFile = undefined) {
    this.content = content;
    this.from = from;
    this.date = date;
    this.isEvent = isEvent;
    this.isFile = isFile;
  }

  toWsMessage() {
    return JSON.stringify({
      msg: this.content,
      from: this.from?.id,
      date: this.date.toISOString(),
      isEvent: this.isEvent,
      isFile: this.isFile,
    });
  }
}
