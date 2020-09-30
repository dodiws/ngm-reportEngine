/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

  // Everything resctricted here
  '*': ['isAuthorized'],

  // public
  'ReportHub/UserController': {
    '*': true,
    'notifyInactiveUsers': ['isAuthorized', 'isAdmin'],
    'deactivateInactiveUsers': ['isAuthorized', 'isAdmin']
  },

  // public
  'ReportHub/MetricsController': {
    '*': true
  },

  // public
  'ReportHub/FileController': {
    'print': true,
    'proxy': true,
    'export': true,
    'getBeneficiairiesCsv': true,
    'getGoogleSheetsJson': true,
    'uploadList': ['isAuthorized', 'isAdmin']
  },

  // public
  'ReportHub/ListController': {
    '*': true,
    'deleteOrganization': ['isAuthorized'],
    'resetOrganizations': ['isAuthorized', 'isAdmin']
  },

  // public
  'iMMAP/Products/ProductsController': {
    'getProductsData': true
  },

  // public
  'Watchkeeper/WatchkeeperController': {
    '*': true
  },

  // public
  'Country/Eth/Ctc/CtcController': {
    '*': true
  },

  // public
  'Country/Eth/Ctc/CtcDashboardController': {
    '*': true
  },

  // public
  'Country/Afg/Epr/EprController': {
    '*': true
  },

  // public
  'Country/Afg/Epr/EprDashboardController': {
    '*': true
  },

  // public
  'Country/Afg/Nutrition/NutritionController': {
    '*': true
  },

  // public
  'Country/Afg/Nutrition/NutritionDashboardController': {
    '*': true
  },

  // public
  'Cluster/Dashboards/AdminDashboardController': {
    '*': true
  },

  // public
  'Cluster/Dashboards/ClusterDashboardController': {
    '*': true
  },

  // download project lists xlsx by link
  'Cluster/Reports/ReportController': {
    'getProjectLists': true
  },

  //Public function to 4wPlus COL getProjectsColAPC in ProjectController

  'Cluster/ProjectController': {
    'getProjectsColAPC': true,
    'setBeneficiariesById': ['isAuthorized', 'isClusterAdmin']
    //'*': true
  },

   // public
  'Cluster/Dashboards/Cluster4wprojectplanDashboardController': {
    '*': true
  },

  //public
  'Cluster/Dashboards/Cluster4wplusDashboardController':{
    '*': true
  },


  // public
  'Cluster/Lists/ListController': {
    '*': true
  },

  // public
  'Cluster/Health/HealthDashboardController': {
    '*': true
  },

  // public
  'Cluster/Reports/ReportTasksController': {
    '*': true
  },

    // public
  'Cluster/Stocks/StockReportController': {
    '*': true,
    'setStocksById': ['isAuthorized', 'isClusterAdmin'],
    'setStockById' : ['isAuthorized'],
    'removeStock'  : ['isAuthorized']
  },


  // Gfa
  'Country/Cxb/Gfa/GfaTaskController': {
    '*': true
  },

  // Gfa Controller
  'Country/Cxb/Gfa/GfaDashboardController': {
    '*': true
  },

    // Livelihoods Controller
  'Country/Cxb/Livelihoods/LivelihoodsTaskController': {
    '*': true
  },

  /***************************************************************************
  *                                                                          *
  * Here's an example of mapping some policies to run before a controller    *
  * and its actions                                                          *
  *                                                                          *
  ***************************************************************************/
	// RabbitController: {

		// Apply the `false` policy as the default for all of RabbitController's actions
		// (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
		// '*': false,

		// For the action `nurture`, apply the 'isRabbitMother' policy
		// (this overrides `false` above)
		// nurture	: 'isRabbitMother',

		// Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
		// before letting any users feed our rabbits
		// feed : ['isNiceToAnimals', 'hasRabbitFood']
	// }
};
