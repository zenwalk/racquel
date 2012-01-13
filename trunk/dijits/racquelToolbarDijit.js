dojo.provide("racquelDijits.racquelToolbarDijit");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Button");
dojo.require("dijit.Toolbar");
dojo.require("racquelDijits.racquelSearchDijit");
dojo.require("racquelDijits.siteSearch");
dojo.require("racquelDijits.routeSearch");
dojo.require("racquelDijits.catchmentSearch");
dojo.require("racquelDijits.racquelResultStore");
dojo.require("racquelDijits.racquelResultManager");
dojo.require("racquelDijits.racquelSearchSettings");
dojo.require("racquelDijits.racquelControlDijit");
dojo.require("racquelDijits.racquelBatchDijit");
dojo.require("racquelDijits.racquelMapSymbols");
dojo.require("racquelDijits.racquelServiceUrls");
dojo.require("dojo.fx.easing");

dojo.declare("racquelDijits.racquelToolbarDijit",[dijit._Widget, dijit._Templated],{
	map: null, // the map to which this dijit is attached
	widgetsInTemplate: true,
	templatePath: dojo.moduleUrl("racquelDijits","templates/racquelToolbarDijit.html"),
	
	racquelSiteDijit: null,
	racquelRouteDijit: null,
	racquelCatchDijit: null,
	racquelResultStore: null,
	racquelSearchDijit: null,
	racquelInteractiveSettings: null,
	racquelControlDijit: null,
	racquelBatchDijit: null,
	racquelMapSymbols: new racquelDijits.racquelMapSymbols(),
	racquelServiceUrls: new racquelDijits.racquelServiceUrls(),
	
	constructor:function(params){
		// racquelToolbar is interested in two paramaters that determine its behaviour: map, and resultDiv
		params = params || {};
		// first set up the things we always need regardless of parameters
		// Result store: load results from last time, if there are any and the browser supports it
		this.racquelResultStore = new racquelDijits.racquelResultStore();
		if (window.localStorage && window.localStorage.getItem("racquelPersistedResults")) {
		// needs work... storage does not retain functions on objects (some json rule) 
		// so the graphics do not have functions like setAttributes when reloaded
		// need to store some simplified representation and restore to that
		// to do this convert each graphic using Graphic.toJson and restore by making new 
		// graphic from that json
		//	this.racquelResultStore.resultStore = dojo.fromJson(window.localStorage.getItem("racquelPersistedResults"));
			console.log("RACQUEL: Results have been loaded from your previous visit");
			var storedRes = window.localStorage.getItem("racquelPersistedResults");
			this.racquelResultStore.addResultsFromStorageItem(dojo.fromJson(storedRes));
		}
		else {
			console.log("RACQUEL: No persisted results found");
			//this.racquelResultStore = new racquelDijits.racquelResultStore();
		}
		dojo.addOnUnload(window, dojo.hitch(this,function(){
			if (this.racquelResultStore.getSearchIds().length>0){
				console.log("Exiting page with results in grid. Will be saved for next time!");
				if (window.localStorage){
					window.localStorage.setItem("racquelPersistedResults",dojo.toJson(this.racquelResultStore.resultStore))
				}
			}
			else {
				// no results in the grid... maybe there were some from last time and user has now deleted them
				// update the localStorage to reflect this
				if (window.localStorage){
					window.localStorage.removeItem("racquelPersistedResults");
				}
			}
		}));
		// always use a batch search dijit
		this.racquelBatchDijit = new racquelDijits.racquelBatchDijit({racquelToolbar:this});
		// we always need site, route, and catchment search dijits, but the site one can be instantiated with or 
		// without a map.
		// routeSearch and catchmentSearch do not care about map
		this.racquelRouteDijit = new racquelDijits.routeSearch();
		this.racquelCatchDijit = new racquelDijits.catchmentSearch();
		if(params.map){
			// Toolbar is in a webpage that contains a map. This means that interactive search can be enabled
			// and we can also pass the map to the siteSearch dijit (used to set tolerance for search).
			// We also need a main racquelSearchDijit, and an interactive variable chooser (racquelControlDijit) and 
			// its associated racquelSearchSettings object 
			this.racquelSiteDijit = new racquelDijits.siteSearch({map:params.map});
			this.racquelSearchDijit = new racquelDijits.racquelSearchDijit({map:map, racquelToolbar:this});
			this.racquelInteractiveSettings = new racquelDijits.racquelSearchSettings(); // new object will be set to use all
			this.racquelControlDijit = new racquelDijits.racquelControlDijit({racquelToolbar:this});
			this.racquelControlDijit.startup();
			// decide whether to render the resultGrid as a floating window or in a fixed container
			// (depends on the users page layout). Default is floating.
			if(params.resultDiv){
				this.racquelResultManager = new racquelDijits.racquelResultManager({map:params.map,racquelToolbar:this,displayMode:"fixed"});
				this.racquelResultManager.placeAt(params.resultDiv);
			}
			else {
				this.racquelResultManager = new racquelDijits.racquelResultManager({racquelToolbar:this,map:params.map});
				//this.racquelResultManager.placeAt(params.map.container);
				this.racquelResultManager.placeAt(dojo.body());
			}
		}
		else{
			// Toolbar is not in a webpage containing a map (that it knows of). 
			// This means that interactive search cannot be enabled and the siteSearch dijit 
			// will use default search tolerances. This can be used for a basic batch-only search page
			// The racquelSearchDijit will not have a map connected either.
			this.racquelSiteDijit = new racquelDijits.siteSearch();
			this.racquelSearchDijit = new racquelDijits.racquelSearchDijit({racquelToolbar:this});
			// again the resultmanager can be fixed or floating
			if(params.resultDiv){
				// resultManager will not be able to display graphics on a map
				this.racquelResultManager = new racquelDijits.racquelResultManager({racquelToolbar:this,displayMode:"fixed"});
				this.racquelResultManager.placeAt(params.resultDiv);
			}
			else {
				this.racquelResultManager = new racquelDijits.racquelResultManager({racquelToolbar:this});
			}
		}
	},
	startup: function(){
		thisDijit = this;
		this.racquelBatchDijit.startup();
		this.racquelResultManager.startup();
	},
	
	setup: function(){
		var id = this.id;
		var duration = 400; // animation speed
		var open_width = 200; // set to suit
		var closed_width = 50; // set to suit
		var easing = dojo.fx.easing.quartInOut;
		
		this.animateOpen = dojo.animateProperty({
			node: id,
			duration: duration,
			properties: {
				width: {end: open_width,unit:"px"}
			},
			easing: easing,
			onEnd: function() {
				toolbarIsOpen = true;
			}
		});
		this.animateClosed = dojo.animateProperty({
			node: id,
			duration: duration,
			properties: {
				width: {end: closed_width, unit: "px"}
			},
			easing:easing,
			onEnd: function(){
				toolbarIsOpen = false;
			}
		});
		var toolbarIsOpen = false;
		var toolbar = dojo.byId(id);
		
		dojo.connect(toolbar,"onmouseenter",function(){
			console.log("open toolbar");
			animationActive=true;
			thisDijit.animateOpen.play();
		});
		dojo.connect(toolbar,"onmouseleave",function(){
			console.log("close toolbar");
			animationActive=false;
			thisDijit.animateClosed.play();
		});
		dojo.connect(toolbar,"onmousemove",function(){
			if (!toolbarIsOpen) {
				thisDijit.animateOpen.play();
			}
		});
	},
	showVarChooser: function(){ 
		console.log("Show variable chooser");
		this.racquelControlDijit.showDialog();
	},
	showWelcomeDialog:function(){
		this._racquelWelcomeDialog.show();
	},
	toggleInteractiveSearch:function(){
		if(this._btnToggleInteractive.checked){
			this.activateInteractiveSearch();
		}
		else {this.disableInteractiveSearch();}
	},
	activateInteractiveSearch: function(){ // this function is called by onClick on the toolbar
		// this will wire the maps' onClickevent rather than showing a dialog directly
		// i.e. behave as a tool like zoom, identify, etc
		console.log("Activate interactive search");
		this.racquelSearchDijit.enableInteractiveSearch();
		//this.activateRACQUELInteractiveSearch();
	},
	disableInteractiveSearch:function(){
		console.log("Disable interactive search");
		this.racquelSearchDijit.disableSearch();
		this._btnToggleInteractive.checked = false; 
		this._btnToggleInteractive.focus(); // otherwise the screen display of it doesn't update!
		// in case it's been disabled other than by clickign the button i.e. if a batch search was initiated
	},
	activateBatchSearch: function(){ // this function is called by onClick on the toolbar
		// this will open a batch search dijit which will allow drag and drop of a csv file
		// in HTML5 browsers and then run multiple racquel searches based on its contents
		//this.showRACQUELBatchDijit();
		console.log("Activate batch search");
		this.disableInteractiveSearch();
		this.racquelBatchDijit.showDialog();
	},
	_loadJS2Shp:function(loaderCallback){
		if(!this.ShapefileLoaded){
			var fileref = document.createElement('script');
			fileref.setAttribute("type","text/javascript");
			fileref.setAttribute("src","lib/JSShapefile_Webkit.js");
			fileref.onload = dojo.hitch(this,function(){
				this.ShapefileLoaded=true;
				loaderCallback();
			});
			fileref.onreadystatechange = dojo.hitch(this,function(){
				if(this.readyState=='complete'){
					this.ShapefileLoaded = true;
					loaderCallback();
				}
			});
			document.getElementsByTagName("head")[0].appendChild(fileref);
		}
		else {
			loaderCallback();
		}
	},
	_loadSaveAs:function(loaderCallback){
		if (!this.fileSaverLoaded){
			var fileref = document.createElement('script');
			fileref.setAttribute("type","text/javascript");
			fileref.setAttribute("src","lib/FileSaver.min.js");
			fileref.onload = dojo.hitch(this,function(){
				this.fileSaverLoaded=true;
				loaderCallback();
			});
			fileref.onreadystatechange = dojo.hitch(this,function(){
				if(this.readyState=='complete'){
					this.fileSaverLoaded = true;
					loaderCallback();
				}
			});
			document.getElementsByTagName("head")[0].appendChild(fileref);
		}
		else {
			loaderCallback();
		}
	}
	
	
})
