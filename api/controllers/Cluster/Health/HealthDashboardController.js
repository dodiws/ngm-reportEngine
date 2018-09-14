/**
 * ProjectController
 *
 * @description :: Health Cluster Dashboard
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


var json2csv = require( 'json2csv' ),
    moment = require( 'moment' );


var ProjectDashboardController = {

    // flatten json
  flatten: function( json ) {
    var array = [];
    for( var i in json ) {
      if ( json.hasOwnProperty( i ) && json[ i ] instanceof Object ){
        array.push( json[ i ] );
      }
    }
    return array;
  },

  // sum beneficiaries by indicator
  sumBeneficiaries: function( data, indicators, beneficiaries, aggregate ) {

    // lookup for aggregations
    var boys_lookup = ['boys', 'boys_referral', 'boys_first_aid_stabalization', 'boys_physical_rehabilitation', 'boys_minor_surgeries', 'boys_major_surgeries', 'penta3_vacc_boys_under1', 'measles_vacc_boys_under1'],
        girls_lookup = ['girls', 'girls_referral', 'girls_first_aid_stabalization', 'girls_physical_rehabilitation', 'girls_minor_surgeries', 'girls_major_surgeries', 'penta3_vacc_girls_under1', 'measles_vacc_girls_under1'],
        men_lookup = ['men', 'men_referral', 'men_first_aid_stabalization', 'men_physical_rehabilitation', 'men_minor_surgeries', 'men_major_surgeries', 'education_male', 'training_male'],
        women_lookup = ['women', 'women_referral', 'women_first_aid_stabalization', 'women_physical_rehabilitation', 'women_minor_surgeries', 'women_major_surgeries', 'antenatal_care', 'postnatal_care', 'skilled_birth_attendant', 'education_female', 'training_female'];

    // each
    for (var b_key in beneficiaries) {
      for (var i_key in indicators) {
        if( b_key === i_key && typeof(beneficiaries[b_key]) === 'number' ) {
          
          // indicators
          if( !aggregate ){
            // sum
            data[i_key] += beneficiaries[b_key];
          }

          // aggregate
          if( aggregate ){

            // under5 aggregate
            if(!data.under5Total){
              data.under5Total = 0;
            }
            // over5 aggregate
            if(!data.over5Total){
              data.over5Total = 0;
            }

            // conflict
            if(b_key === 'conflict_trauma_treated'){
              data.boys += beneficiaries[b_key] * 0.1;
              data.girls += beneficiaries[b_key] * 0.1;
              data.under5Total += beneficiaries[b_key] * 0.2;
              data.men += beneficiaries[b_key] * 0.4;
              data.women += beneficiaries[b_key] * 0.4;
              data.over5Total += beneficiaries[b_key] * 0.8;
            }
            // boys
            if(boys_lookup.indexOf(b_key) !== -1){
              data.boys += beneficiaries[b_key];
              data.under5Total += beneficiaries[b_key];
            }
            // girls
            if(girls_lookup.indexOf(b_key) !== -1){
              data.girls += beneficiaries[b_key];
              data.under5Total += beneficiaries[b_key];
            }
            // men
            if(men_lookup.indexOf(b_key) !== -1 ){
              data.men += beneficiaries[b_key];
              data.over5Total += beneficiaries[b_key];
            }
            // women
            if(women_lookup.indexOf(b_key) !== -1 ){
              data.women += beneficiaries[b_key];
              data.over5Total += beneficiaries[b_key];
            }
          }

          // set total
          if( !data.total ){
            data.total = 0;
          }
          data.total += beneficiaries[b_key];

        }
      }
    }

    return data;
  },

  // aggregate one or many beneficaries
    getBeneficiaries: function( data, indicators, beneficiaries, aggregate ) {

    // delete indicators we dont want to calculate
    delete indicators.id;
    delete indicators.education_sessions;
    delete indicators.training_sessions;
    delete indicators.notes;

    // if beneficiaries is a single record
    if ( !beneficiaries.length ) {
      data = ProjectDashboardController.sumBeneficiaries( data, indicators, beneficiaries, aggregate );
    }

    // if beneficiaries is an array
    if ( beneficiaries.length ) {
      beneficiaries.forEach(function( b, i ){
        data = ProjectDashboardController.sumBeneficiaries( data, indicators, b, aggregate );
      });
    }


    // return total
    return data;

  },

  // contact list
  getContactListCsv: function( req, res ){

    // require
    var fields = [ 'name', 'organization', 'admin0name', 'position', 'phone', 'email', 'createdAt' ],
        fieldNames = [ 'Name', 'Organization', 'Country', 'Position', 'Phone', 'Email', 'Joined ReportHub' ];

    // get all projects ( not empty )
    User
      .find( {} ).exec(function( err, users ){

        // return error
        if ( err ) return res.negotiate( err );

        // format date
        users.forEach( function( d, i ){
          users[ i ].createdAt = moment( d.createdAt ).format('YYYY-MM-DD')
        });

        // return csv
        json2csv({ data: users, fields: fields, fieldNames: fieldNames }, function( err, csv ) {
          
          // error
          if ( err ) return res.negotiate( err );

          // success
          return res.json( 200, { data: csv } );

        });  
      
      }); 

  },

  // prepare and return csv based on filtered project
  getCsvDownload: function( params, filters, indicators, projects, project_ids, res ) {

    // require
    var data = [],
        fields,
        fieldNames;

    // return indicator
    switch( params.details ){

      // OCHA financial Report
      case 'financial':

        // store data by project
        var projectStore = {};
        
        // json2csv
        fields = [ 'id', 'organization', 'admin0pcode', 'admin0name', 'project_code', 'project_title', 'project_budget', 'project_budget_currency', 'project_donor', 'project_budget_date_recieved', 'project_budget_amount_recieved' ],
        fieldNames = [ 'ReportHub ID', 'Partner', 'Country Pcode', 'Country', 'Project Code', 'Project Title', 'Total Project Budget', 'Project Budget Currency', 'Donor', 'Date Funds Recieved', 'Amount Recieved' ];

        // projects
        projects.forEach( function( p, i ){
          // project details
          projectStore[ p.id ] = {}
          projectStore[ p.id ].id = p.id;
          projectStore[ p.id ].organization = p.organization;
          projectStore[ p.id ].admin0pcode = p.admin0pcode;
          projectStore[ p.id ].admin0name = p.admin0name;
          projectStore[ p.id ].project_code = p.project_code;
          projectStore[ p.id ].project_title = p.project_title;

        });

        // get financial details
        BudgetProgress
          .find()
          .where( { project_id: project_ids } )
          .where( filters.financial_filter )
          // .where( filters.financial_filter_s )
          // .where( filters.financial_filter_e )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, budget ) {

            // error
            if ( err ) return res.negotiate( err );

            // budget
            budget.forEach( function( b, i ){

              // latest updated project details
              budget[ i ].organization = projectStore[ b.project_id ].organization;
              budget[ i ].project_code = projectStore[ b.project_id ].project_code;
              budget[ i ].project_title = projectStore[ b.project_id ].project_title;
              budget[ i ].admin0pcode = projectStore[ b.project_id ].admin0pcode;
              budget[ i ].admin0name = projectStore[ b.project_id ].admin0name;
              budget[ i ].project_budget_currency = b.project_budget_currency.toUpperCase();
              budget[ i ].project_budget_date_recieved = moment( b.project_budget_date_recieved ).format('YYYY-MM-DD');

            });
            
            // return csv
            json2csv({ data: budget, fields: fields, fieldNames: fieldNames }, function( err, csv ) {
              
              // error
              if ( err ) return res.negotiate( err );

              // success
              return res.json( 200, { data: csv } );

            });

          });

        break;

      // summarise beneficiaries by location ( admin2 )
      case 'locations':

        // store data by project
        var locationStore = {},
            fields = [ 'admin0pcode', 'admin0name', 'admin1pcode', 'admin1name', 'admin2pcode', 'admin2name', 'boys', 'girls', 'men', 'women', 'penta3_vacc_boys_under1', 'penta3_vacc_girls_under1', 'skilled_birth_attendant', 'conflict_trauma_treated', 'education_male', 'education_female', 'training_male', 'training_female', 'total', 'lng', 'lat' ],
            fieldNames = [  'Country Pcode', 'Country', 'Admin1 Pcode', 'Admin1 Name', 'Admin2 Pcode', 'Admin2 Name', 'Under 5 Male', 'Under 5 Female', 'Over 5 Male', 'Over 5 Female', 'Penta3 Vacc Male Under1', 'Penta3 Vacc Female Under1', 'Skilled Birth Attendant', 'Conflict Trauma Treated', 'Education Male', 'Education Female', 'Capacity Building Male', 'Capacity Building Female', 'Total', 'lng', 'lat' ];

        // beneficiaires
        Beneficiaries
          .find()
          .where( { project_id: project_ids } )
          .where( filters.reporting_filter )
          // .where( filters.reporting_filter_s )
          // .where( filters.reporting_filter_e )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, beneficiaries ){

            // return error
            if ( err ) return res.negotiate( err );
            
            // beneficiaries
            beneficiaries.forEach( function( b, i ){

              // if no values at key
              if ( !locationStore[ b.admin2name ] ) {
                // beneficiaries
                locationStore[ b.admin2name ] = _.merge({}, {}, b);
                // init indicators
                locationStore[ b.admin2name ] = _.merge({}, locationStore[ b.admin2name ], indicators);
              }

              // aggregate beneficiaries
              locationStore[ b.admin2name ] = 
                    ProjectDashboardController.getBeneficiaries( locationStore[ b.admin2name ], indicators, b );

              // location lat, lng
              locationStore[ b.admin2name ].lat = b.admin2lat;
              locationStore[ b.admin2name ].lng = b.admin2lng;                    

            });

            // flatten
            var data = ProjectDashboardController.flatten( locationStore );

            // return csv
            json2csv({ data: data, fields: fields, fieldNames: fieldNames }, function( err, csv ) {
              
              // error
              if ( err ) return res.negotiate( err );

              // success
              return res.json( 200, { data: csv } );

            });

          });

        break;

      // summarise beneficiaries by health_facility
      case 'health_facility':

        // store data by project
        var projectStore = {},
          fields = [ 'project_id', 'organization', 'project_code', 'project_title', 'project_status', 'project_start_date', 'project_end_date', 'admin0pcode', 'admin0name', 'admin1pcode', 'admin1name', 'admin2pcode', 'admin2name', 'site_type_name', 'site_name', 'beneficiary_type', 'boys', 'girls', 'men', 'women', 'penta3_vacc_boys_under1', 'penta3_vacc_girls_under1', 'skilled_birth_attendant', 'conflict_trauma_treated', 'education_male', 'education_female', 'training_male', 'training_female', 'total', 'lng', 'lat' ],
          fieldNames = [ 'Project ID', 'Partner', 'Project Code', 'Project Title', 'Project Status', 'Project Start Date', 'Project End Date', 'Country Pcode', 'Country', 'Admin1 Pcode', 'Admin1 Name', 'Admin2 Pcode', 'Admin2 Name', 'Health Facility Type', 'Health Facility Name', 'Beneficiary Category', 'Under 5 Male', 'Under 5 Female', 'Over 5 Male', 'Over 5 Female', 'Penta3 Vacc Male Under1', 'Penta3 Vacc Female Under1', 'Skilled Birth Attendant', 'Conflict Trauma Treated', 'Education Male', 'Education Female', 'Capacity Building Male', 'Capacity Building Female', 'Total', 'lng', 'lat' ];

        // beneficiaires
        Beneficiaries
          .find()
          .where( { project_id: project_ids } )
          .where( filters.reporting_filter )
          // .where( filters.reporting_filter_s )
          // .where( filters.reporting_filter_e )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, beneficiaries ){
            
            // return error
            if ( err ) return res.negotiate( err );

            // beneficiaries
            beneficiaries.forEach( function( b, i ){

              // if no values at key
              if ( !projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ] ) {
                // beneficiaries
                projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ] = _.merge({}, {}, b);
                // init indicators
                projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ] = _.merge({}, projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ], indicators);
              }

              // aggregate beneficiaries
              projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ] = 
                    ProjectDashboardController.getBeneficiaries( projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ], indicators, b );

              // lat/lng
              projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ].lat = b.admin2lat;
              projectStore[ b.project_id + b.admin2pcode + b.site_type + b.site_name + b.beneficiary_type ].lng = b.admin2lng;

            });
  
            // project store to data
            var data = ProjectDashboardController.flatten( projectStore );

            // project data
            data.forEach( function( pd, i ){

              // projects
              projects.forEach( function( p, j ){
                
                // project details
                if ( pd.project_id === p.id ) {
                  data[i].project_code = p.project_code;
                  data[i].project_title = p.project_title;
                  data[i].project_status = p.project_status;
                  data[i].project_start_date = moment( p.project_start_date ).format( 'YYYY-MM-DD' );
                  data[i].project_end_date = moment( p.project_end_date ).format( 'YYYY-MM-DD' );          
                }

              });

            });

            // return csv
            json2csv({ data: data, fields: fields, fieldNames: fieldNames }, function( err, csv ) {
              
              // error
              if ( err ) return res.negotiate( err );

              // success
              return res.json( 200, { data: csv } );

            });

          });


        break;

      // OCHA Project Progress Report
      default: 

        // store data by project
        var aggregate = true,
            projectStore = {};
        
        // json2csv
        fields = [ 'project_id', 'organization', 'project_code', 'project_title', 'project_status', 'project_start_date', 'project_end_date', 'admin0pcode', 'admin0name', 'admin1pcode', 'admin1name', 'beneficiary_type', 'boys', 'girls', 'men', 'women', 'total', 'lat', 'lng' ],
        fieldNames = [ 'Project ID', 'Partner', 'Project Code', 'Project Title', 'Project Status', 'Project Start Date', 'Project End Date', 'Country Pcode', 'Country', 'Admin1 Pcode', 'Admin1 Name', 'Beneficiary Category', 'boys', 'girls', 'men', 'women', 'Total', 'lat', 'lng' ];

        // beneficiaires
        Beneficiaries
          .find()
          .where( { project_id: project_ids } )
          .where( filters.reporting_filter )
          // .where( filters.reporting_filter_s )
          // .where( filters.reporting_filter_e )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, beneficiaries ){
            
            // return error
            if ( err ) return res.negotiate( err );

            // beneficiaries
            beneficiaries.forEach( function( b, i ){

              // beneficiaries
              if ( !projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ] ) {
                // beneficiaries
                projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ] = _.merge({}, {}, b);
                // init indicators
                projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ] = _.merge({}, projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ], indicators);                
              }

              // aggregate beneficiaries
              projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ] = 
                    ProjectDashboardController.getBeneficiaries( projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ], indicators, b, aggregate );

              // lat/ng
              projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ].lat = b.admin1lat;
              projectStore[ b.project_id + b.admin1pcode + b.beneficiary_type ].lng = b.admin1lng;              

            });

            // project store to data
            var data = ProjectDashboardController.flatten( projectStore );

            // project data
            data.forEach( function( pd, i ){

              // projects
              projects.forEach( function( p, j ){
                
                // project details
                if ( pd.project_id === p.id ) {
                  data[i].project_code = p.project_code;
                  data[i].project_title = p.project_title;
                  data[i].project_status = p.project_status;
                  data[i].project_start_date = moment( p.project_start_date ).format( 'YYYY-MM-DD' );
                  data[i].project_end_date = moment( p.project_end_date ).format( 'YYYY-MM-DD' );          
                }

              });

            });

            // return csv
            json2csv({ data: data, fields: fields, fieldNames: fieldNames }, function( err, csv ) {
              
              // error
              if ( err ) return res.negotiate( err );

              // success
              return res.json( 200, { data: csv } );

            });

          });

        break;

    }    

  },

  // dashboard params to filter projects
  getHealthDetails: function( req, res ){

    // request input
    // if ( ( !req.param('project_id') ) || ( !req.param('start_date') || !req.param('end_date') || !req.param('project_type') || !req.param('beneficiary_type') || !req.param('admin1pcode') || !req.param('admin2pcode') ) ) {
    //   return res.json(401, {err: 'indicator, start_date, end_date, project_status, project_type, beneficiary_type, admin1pcode, admin2pcode required!'});
    // }


    // get params
    var params = {

      // organizations to ignore
      $nin_organizations: [ 'immap', 'arcs' ],
      
      details: req.param('details') ? req.param('details') : false,

      unique: req.param('unique') ? req.param('unique') : false,

      indicator: req.param('indicator') ? req.param('indicator') : false,
      
      project_id: req.param('project_id') ? req.param('project_id') : false,

      project_status: req.param('project_status') ? req.param('project_status') : false,
      
      start_date: req.param('start_date') ? req.param('start_date') : '1990-01-01',
      end_date: req.param('end_date') ? req.param('end_date') : '2020-12-31',
      
      project_type: req.param('project_type') ? req.param('project_type') : ['all'],
      beneficiary_type: req.param('beneficiary_type') ? req.param('beneficiary_type') : ['all'],

      // organization
      organization_tag: req.param('organization_tag') ? req.param('organization_tag') : false,

      //
      // cluster_id
      cluster_id: req.param('adminRpcode') !== 'all' ? req.param('cluster_id') : '*',
      adminRpcode: req.param('adminRpcode') !== 'hq' ? req.param('adminRpcode').toUpperCase() : '*',
      admin0pcode: req.param('admin0pcode') !== 'all' ? req.param('admin0pcode').toUpperCase() : '*',
      admin1pcode: req.param('admin1pcode') !== 'all' ? req.param('admin1pcode') : '*',
      admin2pcode: req.param('admin2pcode') !== 'all' ? req.param('admin2pcode') : '*',

      //
      conflict: req.param('conflict') ? req.param('conflict') : false
    }

    // filters
    var filters = {
      
      // project_id
      project_id: params.project_id ? { id: params.project_id } : {},

      // organizations
      organization_filter: params.organization_tag === 'all' ? { organization_tag: { '!': params.$nin_organizations } } : { organization_tag: params.organization_tag },

      // organization $nin
      organization_$nin_filter: { organization_tag: { '!': params.$nin_organizations } },

      // admin1pcode locations filter
      cluster_id_filter: params.cluster_id !== '*' ? { cluster_id: params.cluster_id } : {},      
      // admin1pcode locations filter
      adminRpcode_filter: params.adminRpcode !== '*' ? { adminRpcode: params.adminRpcode } : {},
      // admin2pcode locations filter
      admin0pcode_filter: params.admin0pcode !== '*' ? { admin0pcode: params.admin0pcode } : {},
      // admin1pcode locations filter
      admin1pcode_filter: params.admin1pcode !== '*' ? { admin1pcode: params.admin1pcode } : {},
      // admin2pcode locations filter
      admin2pcode_filter: params.admin2pcode !== '*' ? { admin2pcode: params.admin2pcode } : {},

      // date_filter
      date_filter_s: { project_start_date: { '<=': new Date( params.end_date ) } },
      date_filter_e: { project_end_date: { '>=': new Date( params.start_date ) } },
      
      // beneficiaries report_month
      reporting_filter: { reporting_period: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } },
      // reporting_filter_s: { reporting_period: { '>=': new Date( params.start_date ) } },
      // reporting_filter_e: { reporting_period: { '<=': new Date( params.end_date ) } },
      
      // financial payment month
      financial_filter: { project_budget_date_recieved: { '>=': new Date( params.start_date ), '<=': new Date( params.end_date ) } },
      // financial_filter_s: { project_budget_date_recieved: { '>=': new Date( params.start_date ) } },
      // financial_filter_e: { project_budget_date_recieved: { '<=': new Date( params.end_date ) } },
      
      // project_status
      project_status_filter: params.project_status ? { project_status: params.project_status } : {},
      
      // project_type
      project_type_filter: params.project_type[0] === 'all' ? {} : { project_type: params.project_type },
      
      // beneficiaries_filter
      beneficiaries_filter: params.beneficiary_type[0] === 'all' ? {} : { beneficiary_type: params.beneficiary_type }

    };
    
    // get projects by organization_id
    Project.find()
      .where( filters.project_id )
      .where( filters.date_filter_s )
      .where( filters.date_filter_e )
      
      .where( filters.cluster_id_filter )
      .where( filters.adminRpcode_filter )
      .where( filters.admin0pcode_filter )
      .where( filters.organization_filter )
      .where( filters.admin1pcode_filter )
      .where( filters.admin2pcode_filter )

      .where( filters.project_status_filter )
      .where( filters.project_type_filter )
      .where( filters.beneficiaries_filter )
      // .where( filters.organization_$nin_filter )
      .exec( function( err, projects ){
      
        // return error
        if (err) return res.negotiate( err );

        // if no projects
        if ( !projects.length && params.indicator !== 'markers' ) return res.json( 200, { 'value': 0 } );

        // if no markers
        if ( !projects.length && params.indicator === 'markers' ) return res.json( 200, { 'data': { 'marker0': { layer: 'health', lat:34.5, lng:66.0, message: '<h5 style="text-align:center; font-size:1.5rem; font-weight:100;">NO PROJECTS</h5>' } } } );

        // get project ids
        var project_ids = [];        
        projects.forEach( function( p, i ) {
          // project id
          project_ids.push( p.id );

        });

        Indicators
          .findOne({ boys: 0 })
          .exec(function(err, indicators){
            
            // if indicator, else data
            if ( params.indicator ) {

              // calculate and return metric
              ProjectDashboardController.getIndicatorMetric( params, filters, indicators, projects, project_ids, res );

            } else{

              // prepare download
              ProjectDashboardController.getCsvDownload( params, filters, indicators, projects, project_ids, res );

            }

          });

      });

  },

  // calculate indicator value from filtered project ids
  getIndicatorMetric: function( params, filters, indicators, projects, project_ids, res ) {

    // return indicator
    switch( params.indicator ){

      // organizations
      case 'partners':

        // organization_ids
        var filter = {},
            organization_ids = [];
        
        // filter by $projects
        projects.forEach( function( d, i ){
          organization_ids.push( d.organization_id );
        });

        // params
        filter = params.project_status ? { id: organization_ids } : {};

        // no. of organizations
        Organization.count( filter ).exec( function( err, value ){

          // return error
          if ( err ) return res.negotiate( err );

          // return new Project
          return res.json( 200, { 'value': value } );

        });

        break;

      // proejcts
      case 'projects':

        // return new Project
        return res.json( 200, { 'value': projects.length });

        break;

      // locations
      case 'locations':

        // locations
        var locations = {},
            conflict = !params.conflict ? {} : { conflict: true };

        // actual locations
        TargetLocation
          .find()
          .where( { project_id: project_ids } )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .where( conflict )
          .exec( function( err, target_locations ) {

            // return error
            if (err) return res.negotiate( err );

            // if no length
            if ( !target_locations.length ) return res.json(200, { 'value': 0 } );

            // unique locations
            if ( params.unique ) {
              
              // for each
              target_locations.forEach( function( location, i ){
                //
                locations[ location.admin2name ] = location;

              });
              
              locations = ProjectDashboardController.flatten( locations );

            } else {

              // total locations
              locations = target_locations;
            }

            // actual locations
            Admin2
              .find()
              .where( filters.adminRpcode_filter )
              .where( filters.admin0pcode_filter )
              .where( filters.admin1pcode_filter )
              .where( filters.admin2pcode_filter )              
              .where( conflict )
              .exec( function( err, conflict_locations ) {    

                // return error
                if (err) return res.negotiate( err );

                // return new Project
                return res.json(200, { 'value': locations.length, 'value_total': conflict_locations.length });

              });

          });

          break;

      // facilities by type
      case 'facilities':

        // target locations
        TargetLocation
          .find()
          .where( { project_id: project_ids } )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, locations ){

            // return error
            if (err) return res.negotiate( err );

            // chart data
            var facilities = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]

            // each location
            locations.forEach( function( location, i ){

              // switch
              switch ( location.site_type ) {

                // cases
                case 'RH':
                  facilities[0]++;
                  break;

                case 'PH':
                  facilities[1]++;
                  break;

                case 'DH':
                  facilities[2]++;
                  break;

                case 'CHC':
                  facilities[3]++;
                  break;

                case 'BHC':
                  facilities[4]++;
                  break;

                case 'FHH':
                  facilities[5]++;
                  break;

                case 'SHC':
                  facilities[6]++;
                  break;

                case 'MHT':
                  facilities[7]++;
                  break;

                case 'FATP':
                  facilities[8]++;
                  break;

                case 'DATC':
                  facilities[9]++;
                  break;

                case 'rehabilitation_center':
                  facilities[10]++;
                  break;

                case 'special_hospital':
                  facilities[11]++;
                  break;

                case 'BHC+FATP':
                  facilities[12]++;
                  break;

                case 'CHC+FATP':
                  facilities[13]++;
                  break;

              }

              // if ( !facilities[ location.site_type ] ) {
              //   facilities[ location.site_type ] = {};
              //   facilities[ location.site_type ].name = location.site_type_name;
              //   facilities[ location.site_type ].y = 0;
              // }
              // // increment
              // facilities[ location.site_type ].y++;

            });

            // return highcharts data
            return res.json(200, { 'data': facilities } );

          });        

        break;

      // markers
      case 'markers':

        // params
        var markers = {},
            counter = 0,
            length = 0;

        // target locations
        TargetLocation
          .find()
          .where( { project_id: project_ids } )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, locations ){

            // return error
            if (err) return res.negotiate( err );

            // return no locations
            if ( !locations.length ) return res.json( 200, { 'data': { 'marker0': { layer: 'health', lat:34.5, lng:66.0, message: '<h5 style="text-align:center; font-size:1.5rem; font-weight:100;">NO PROJECTS</h5>' } } } );

            // length
            length = locations.length;

            // foreach location
            locations.forEach( function( d, i ){

              // get user details
              User.findOne( { username: d.username } ).exec( function( err, user ){

                // return error
                if (err) return res.negotiate( err );

                // popup message
                var message = '<h5 style="text-align:center; font-size:1.5rem; font-weight:100;">' + user.organization + ' | ' + d.project_title + '</h5>'
                            + '<div style="text-align:center">' + d.admin0name + '</div>'
                            + '<div style="text-align:center">' + d.admin1name + ', ' + d.admin2name + '</div>'
                            + '<div style="text-align:center">' + d.site_type_name + '</div>'
                            + '<div style="text-align:center">' + d.site_name + '</div>'
                            + '<h5 style="text-align:center; font-size:1.5rem; font-weight:100;">CONTACT</h5>'
                            + '<div style="text-align:center">' + user.name + '</div>'
                            + '<div style="text-align:center">' + user.position + '</div>'
                            + '<div style="text-align:center">' + user.phone + '</div>'
                            + '<div style="text-align:center">' + user.email + '</div>';

                // create markers
                markers[ 'marker' + counter ] = {
                  layer: 'health',
                  lat: d.admin2lat,
                  lng: d.admin2lng,
                  message: message
                };

                // plus
                counter++;

                // if last location
                if( counter === length ){
                  
                  // return markers
                  return res.json(200, { 'data': markers } );

                }

              });

            });                          

          });

        break;

      // beneficiaries
      case 'beneficiaries':

        // beneficiaires
        Beneficiaries
          .find()
          .where( { project_id: project_ids } )
          .where( filters.reporting_filter )
          // .where( filters.reporting_filter_s )
          // .where( filters.reporting_filter_e )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, beneficiaries ){

            // return error
            if ( err ) return res.negotiate( err );

            // if no length
            if ( !beneficiaries.length ) return res.json(200, { 'value': 0 } );

            // init indicators
            $beneficiaries = _.merge({}, $beneficiaries, indicators);

            // sum beneficiaries
            $beneficiaries = 
              ProjectDashboardController.getBeneficiaries( {}, indicators, beneficiaries );

            // res
            return res.json(200, { 'value': $beneficiaries.total } ); 

          });

        break;
        
      // beneficiaries
      default:

        // labels
        var result = {
              label: {
                left: {
                  label: {
                    prefix: 'M',
                    label: 0,
                    postfix: '%'
                  },
                  subLabel: {
                    label: 0
                  }
                },
                center: {
                  label: {
                    label: 0,
                    postfix: '%'
                  },
                  subLabel: {
                    label: 0
                  }
                },
                right: {
                  label: {
                    prefix: 'F',
                    label: 0,
                    postfix: '%'
                  },
                  subLabel: {
                    label: 0
                  }
                }
              },
              data: [{
                'y': 0,
                'color': '#f48fb1',
                'name': 'Female',
                'label': 0,
              },{
                'y': 0,
                'color': '#90caf9',
                'name': 'Male',
                'label': 0,
              }]
            };

        // beneficiaries
        var aggregate = true,
            $beneficiaries = {};

        // beneficiaires
        Beneficiaries
          .find()
          .where( { project_id: project_ids } )
          .where( filters.reporting_filter )
          // .where( filters.reporting_filter_s )
          // .where( filters.reporting_filter_e )
          .where( filters.cluster_id_filter )
          .where( filters.adminRpcode_filter )
          .where( filters.admin0pcode_filter )
          .where( filters.organization_filter )
          .where( filters.admin1pcode_filter )
          .where( filters.admin2pcode_filter )
          // .where( filters.organization_$nin_filter )
          .exec( function( err, beneficiaries ){

            // return error
            if ( err ) return res.negotiate( err );

            // if no length
            if ( !beneficiaries.length ) return res.json(200, { 'value': 0 } );
            
            // init indicators
            $beneficiaries = _.merge({}, $beneficiaries, indicators);

            // sum beneficiaries
            $beneficiaries = 
              ProjectDashboardController.getBeneficiaries( $beneficiaries, indicators, beneficiaries, aggregate );

            // breakdown
            switch( params.indicator ){

              // indicator
              case 'under5':

                // calc %
                var malePerCent = ( $beneficiaries.boys / ( $beneficiaries.boys + $beneficiaries.girls ) ) * 100;
                var femalePerCent = ( $beneficiaries.girls / ( $beneficiaries.boys + $beneficiaries.girls ) ) * 100;
                var totalPerCent = ( $beneficiaries.under5Total / ( $beneficiaries.under5Total + $beneficiaries.over5Total ) ) * 100;
                
                // assign data left
                result.label.left.label.label = malePerCent;
                result.label.left.subLabel.label = $beneficiaries.boys;
                // assign data center
                result.label.center.label.label = totalPerCent;
                result.label.center.subLabel.label = $beneficiaries.under5Total;
                // assign data right
                result.label.right.label.label = femalePerCent;
                result.label.right.subLabel.label = $beneficiaries.girls;

                // highcharts female
                result.data[0].y = femalePerCent;
                result.data[0].label = $beneficiaries.under5Total;
                // highcharts male
                result.data[1].y = malePerCent;
                result.data[1].label = $beneficiaries.under5Total;
                
                break;

              case 'over5':
                
                // calc %
                var malePerCent = ( $beneficiaries.men / ( $beneficiaries.men + $beneficiaries.women ) ) * 100;
                var femalePerCent = ( $beneficiaries.women / ( $beneficiaries.women + $beneficiaries.men ) ) * 100;
                var totalPerCent = ( $beneficiaries.over5Total / ( $beneficiaries.under5Total + $beneficiaries.over5Total ) ) * 100;
                
                // assign data left
                result.label.left.label.label = malePerCent;
                result.label.left.subLabel.label = $beneficiaries.men;
                // assign data center
                result.label.center.label.label = totalPerCent;
                result.label.center.subLabel.label = $beneficiaries.over5Total;
                // assign data right
                result.label.right.label.label = femalePerCent;
                result.label.right.subLabel.label = $beneficiaries.women;

                // highcharts female
                result.data[0].y = femalePerCent;
                result.data[0].label = $beneficiaries.over5Total;
                // highcharts male
                result.data[1].y = malePerCent;
                result.data[1].label = $beneficiaries.over5Total;

                break;
            }

            // return new Project
            return res.json( 200, result );

          });


        break;

    }

  }

};

module.exports = ProjectDashboardController;
