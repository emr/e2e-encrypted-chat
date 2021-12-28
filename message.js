module.exports = class Message {
  /**
   * @param content {string}
   * @param from {User|undefined}
   * @param date {Date}
   * @param isEvent {boolean}
   */
  constructor(content, from, date, isEvent = undefined) {
    this.content = content;
    this.from = from;
    this.date = date;
    this.isEvent = isEvent;
  }

  toWsMessage() {
    return JSON.stringify({
      msg: this.content,
      from: this.from?.id,
      date: this.date.toISOString(),
      isEvent: this.isEvent,
    });
  }
}
