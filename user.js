module.exports = class User {
  /**
   * @param id {string}
   * @param connection {WebSocket}
   */
  constructor(id, connection) {
    this.id = id;
    this.connection = connection;
  }
}
