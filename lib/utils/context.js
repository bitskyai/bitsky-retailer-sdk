class Context{
  constructor(){
    this.initedTime = Date.now();
    this.logger = console;
  }
}

module.exports = Context;
