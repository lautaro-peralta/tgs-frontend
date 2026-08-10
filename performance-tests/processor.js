/**
 * Artillery processor for dynamic data generation
 * Provides custom functions for test scenarios
 */

module.exports = {
  /**
   * Generate random product data for testing
   */
  generateRandomProduct: function(context, events, done) {
    context.vars.productId = Math.floor(Math.random() * 1000) + 1;
    context.vars.quantity = Math.floor(Math.random() * 5) + 1;
    return done();
  },

  /**
   * Generate random user data for testing
   */
  generateRandomUser: function(context, events, done) {
    const userId = Math.floor(Math.random() * 10000);
    context.vars.email = `user${userId}@test.com`;
    context.vars.dni = `${userId}`;
    context.vars.name = `Test User ${userId}`;
    return done();
  },

  /**
   * Generate random search query
   */
  generateSearchQuery: function(context, events, done) {
    const queries = ['whisky', 'wine', 'vodka', 'beer', 'rum', 'tequila'];
    context.vars.searchQuery = queries[Math.floor(Math.random() * queries.length)];
    return done();
  },

  /**
   * Log response time for monitoring
   */
  logResponseTime: function(requestParams, response, context, ee, next) {
    if (response.timings) {
      console.log(`Response time: ${response.timings.phases.total}ms`);
    }
    return next();
  }
};
