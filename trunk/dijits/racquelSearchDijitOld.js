dojo.provide("racquelDijits.racquelSearchDijit");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.DeferredList");

dojo.declare("racquelDijits.racquelSearchDijit",[dijit._Widget,dijit._Templated],{
	widgetsInTemplate:true,
	templatePath:dojo.moduleUrl("racquelDijits","templates/racquelSearchDijit.html"),
	constructor:function(params){
		this.searchPoint = params.searchPoint || null;
		this.doSiteSearch = params.siteSearch || false;
		this.doRouteSearch = params.routeSearch || false;
		this.doCatchmentSearch = params.catchmentSearch || false;
		if (!(this.doSiteSearch||this.doRouteSearch||this.doCatchmentSearch)){
			this.canRun = false;
		}
		else{
			this.canRun=true;
		}
		
	},
	startSearches:function(){
		var _taskList = [];
		if(this.doSiteSearch){
			var siteSearch = new racquelDijits.siteSearch(this.searchPoint);
			var siteSearchDef = siteSearch.runSearch();
			_taskList.push(siteSearchDef);
		}
		if(this.doRouteSearch){
			var routeSearch = new racquelDijits.routeSearch(this.searchPoint);
			var routeSearchDef = routeSearch.runSearch();
		}	
		if(this.doCatchmentSearch){
			this.catchmentSearch = new racquelDijits.catchmentSearch(this.searchPoint);
			var catchmentSearchDef = catchmentSearch.runSearch();
		}
		if(_taskList.length>0){
			var deferredList = new dojo.DeferredList(_taskList);
			deferredList.then(dojo.hitch(this,function(){
				alert("All searches complete");
				// resutls are in each of the search objects. Retrieve them and load to a master results object
				// load this to the racquel results dijit. Add the results to the map
			}))
		
		}
	}
	
})
