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
dojo.require("racquelDijits.racquelServiceConfig");
dojo.require("dojo.fx.easing");
dojo.require("dojo.io.script"); // load non-dojo scripts on demand
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
	racquelServiceConfigObject: new racquelDijits.racquelServiceConfig(),
	
	constructor:function(params){
		// racquelToolbar is interested in two parameters that determine its behaviour: map, and resultDiv
		params = params || {};
		// first set up the things we always need regardless of parameters
		// Result store: load results from last time, if there are any and the browser supports it
		this.racquelResultStore = new racquelDijits.racquelResultStore();
		this.canDoBatchSearch = (window.File && window.FileReader);
		this.canSaveResults = window.localStorage !== 'undefined';
		// load geotools - used to transform WGS84 into OSGB on client-side (for use with GPS tracking)
		this.loadExternalScript("lib/geotools2.js")
		// always use a batch search dijit
		this.racquelBatchDijit = new racquelDijits.racquelBatchDijit({racquelToolbar:this});
		// we always need site, route, and catchment search dijits, but the site one can be instantiated with or 
		// without a map.
		// routeSearch and catchmentSearch do not care about map
		this.racquelServiceConfig = this.racquelServiceConfigObject[params.serviceConfigName];
		this.racquelInteractiveSettings = new racquelDijits.racquelSearchSettings({
		}); // new object will be set to use all
		var extractionDef = 
			this.racquelInteractiveSettings.getExtractionParameters(this.racquelServiceConfig);
				

		this.racquelRouteDijit = new racquelDijits.routeSearch({
			serviceConfig: this.racquelServiceConfig
		});
		this.racquelCatchDijit = new racquelDijits.catchmentSearch({
			serviceConfig:this.racquelServiceConfig
		});
		if(!params.isTablet ){
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelToolbarDijit.html"));
		}
		else {
			this.templateString = dojo.cache(dojo.moduleUrl("racquelDijits","templates/racquelToolbarDijitTablet.html"));
		}
		if(params.map){
			// Toolbar is in a webpage that contains a map. This means that interactive search can be enabled
			// and we can also pass the map to the siteSearch dijit (used to set tolerance for search).
			// We also need a main racquelSearchDijit, and an interactive variable chooser (racquelControlDijit) and 
			// its associated racquelSearchSettings object 
			this.racquelSiteDijit = new racquelDijits.siteSearch({
				map:params.map,
				serviceConfig:this.racquelServiceConfig
			});
			this.racquelSearchDijit = new racquelDijits.racquelSearchDijit({map:map, racquelToolbar:this});
			this.racquelControlDijit = new racquelDijits.racquelControlDijit({racquelToolbar:this});
			this.racquelControlDijit.startup();
			// decide whether to render the resultGrid as a floating window or in a fixed container
			// (depends on the users page layout). Default is floating.
			if(params.resultDiv){
				this.racquelResultManager = new racquelDijits.racquelResultManager({map:params.map,racquelToolbar:this,displayMode:"fixed"});
				this.racquelResultManager.placeAt(dojo.byId(params.resultDiv));
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
			this.racquelSiteDijit = new racquelDijits.siteSearch({
				serviceConfig:this.racquelServiceUrls.racquelSiteService
			});
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
		dojo.addOnUnload(dojo.hitch(this,function(){
			this._confirmUnload();
		}));
		//if (dojo.isWebKit){
		//	document.body.onbeforeunload=dojo.hitch(this,function(){
		//		this._confirmUnload();
		//	});
		//}
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
		this.getLoadResultsContent();
		this._racquelWelcomeDialog.show();
	},
	showHelp:function(){
		this._racquelWelcomeTabs.selectChild(this._racquelWelcomeTabHelp);
		this.getContinueSessionContent();
		this._racquelWelcomeDialog.show();
	},
	showAdvancedInfo:function(){
		var infoTabIdx = this._racquelWelcomeTabs.getIndexOfChild(this.tabTechInfo);
		if (infoTabIdx == -1) {
			this._racquelWelcomeTabs.addChild(this.tabTechInfo);
		}
		this._racquelWelcomeTabs.selectChild(this.tabTechInfo);
	},
	_confirmUnload:function(){
		if (this.racquelResultStore.getSearchIds().length>0 && window.localStorage){
				//var save = confirm("Bye! Would you like to save your results for next time?");
				//if (save){
					window.localStorage.setItem("racquelPersistedResults",dojo.toJson(this.racquelResultStore.resultStore));
					console.log("saved");
				//}
			}
			else {
				// no results in the grid... maybe there were some from last time and user has now deleted them
				// update the localStorage to reflect this
				//alert("Bye!");
				if (window.localStorage){
					window.localStorage.removeItem("racquelPersistedResults");
				}
			}
	},
	getLoadResultsContent: function(){
		var reloadPane = new dijit.layout.ContentPane({
		});
		if (this.canSaveResults && window.localStorage.getItem("racquelPersistedResults")) { 
			console.log("RACQUEL: Persisted results found");
			var content = ("It seems like you've been here before! "+
				"RACQUEL has found some results stored from a previous visit. Please click Reload "+
				"if you'd like to reload these results, or New Session if you'd like to discard them.");
			reloadPane.set('content',dojo.create("div",{
				innerHTML:content,
				className:"racquelWelcomeContentItem"
			}));
			var yesButton = new dijit.form.Button({
				label: "Reload",
				onClick: dojo.hitch(this, function(){
					this._loadResults();
					this._racquelWelcomeDialog.hide();
				})
			});
			yesButton.startup();
			var noButton = new dijit.form.Button({
				label: "New Session",
				onClick: dojo.hitch(this, function(){
					this._racquelWelcomeDialog.hide();
				})
			});
			noButton.startup();
			dojo.place(yesButton.domNode,reloadPane.domNode,"last");
			dojo.place(noButton.domNode,reloadPane.domNode,"last");
		}
		else {
			var content = "No saved results found! Press New Session to start using RACQUEL";
			reloadPane.set ("content",content);
			var shooButton = new dijit.form.Button({
				label: "New Session",
				onClick: dojo.hitch(this, function(){
					this._racquelWelcomeDialog.hide();
				})
			});
			shooButton.startup();
			dojo.place(shooButton.domNode,reloadPane.domNode,"last");
		}
		reloadPane.set("className","outlinedMarginPane");
		reloadPane.startup();
		this._racquelReloadContent.set('content',reloadPane.domNode);
	},
	getContinueSessionContent:function(){
		var reloadPane = new dijit.layout.ContentPane({
		});
		var content = "Press OK to return to your session ";
		reloadPane.set('content',dojo.create("div",{
			innerHTML:content,
			className:"racquelWelcomeContentItem"
		}));
		var okButton = new dijit.form.Button({
			label: "OK",
			onClick: dojo.hitch(this, function(){
				this._racquelWelcomeDialog.hide();
			})
		});
		okButton.startup();
		dojo.place(okButton.domNode,reloadPane.domNode,"last");
		this._racquelReloadContent.set('content',reloadPane.domNode);
	},
	
	_loadResults:function(){
		// NOTE: localStorage does not retain functions on objects (some json rule), 
		// so the graphics do not have functions like setAttributes when they are reloaded.
		// Instead, store some simplified representation and restore to that.
		// To do this convert each graphic using Graphic.toJson and restore by making new 
		// graphic from that json
		//this.racquelResultStore.resultStore = dojo.fromJson(window.localStorage.getItem("racquelPersistedResults"));
		var storedRes = window.localStorage.getItem("racquelPersistedResults");
		this.racquelResultStore.addResultsFromStorageItem(dojo.fromJson(storedRes));
		console.log("RACQUEL: Results have been loaded from your previous visit");
	},
	toggleInteractiveSearch:function(){
		if(this._btnToggleInteractive.checked){
			this.activateInteractiveSearch();
		}
		else {this.disableInteractiveSearch();}
	},
	runCrossHairSearch:function(){
		//this.disableInteractiveSearch();
		// call cross hair search routine
		this.racquelSearchDijit.runCrossHairSearch();
	},
	toggleGeolocation:function(){
		if (this._btnToggleGeolocation.checked){
			this._startLocation();
		}
		else {
			this._stopLocation();
		}
	},
	_startLocation:function(){
		if (this.watchProcess != null){
			// already running, shouldn't have been called... ignore
			return;
		}
		else if (navigator.geolocation){
			this.watchProcess = navigator.geolocation.watchPosition(
			dojo.hitch(this,this._processLocation),
			dojo.hitch(this,this._locationError),
			{
				enableHighAccuracy:true,
				maximumAge:30000,
				frequency:10000
			});
		}
	},
	_stopLocation:function(){
		if (this.watchProcess != null){
			navigator.geolocation.clearWatch(this.watchProcess);
			this.watchProcess=null;
		}
	},
	_processLocation:function(loc){
		if (GT_WGS84){
			var wgs84 = new GT_WGS84();
			wgs84.setDegrees(loc.coords.latitude,loc.coords.longitude);
			var osgb = wgs84.getOSGB();
			var point = new esri.geometry.Point(osgb.eastings,osgb.northings,new esri.SpatialReference({ wkid: 27700 }));
			this.map.centerAt(point);	
		}
	},
	_locationError:function(){
		console.log("Location error");
		return;
	},
	activateInteractiveSearch: function(){ // this function is called by onClick on the toolbar
		// this will wire the maps' onClickevent rather than showing a dialog directly
		// i.e. behave as a tool like zoom, identify, etc
		console.log("Activate interactive search");
		this.racquelSearchDijit.enableInteractiveSearch();
	},
	disableInteractiveSearch:function(){
		console.log("Disable interactive search");
		this.racquelSearchDijit.disableSearch();
		this._btnToggleInteractive.checked = false; 
		this._btnToggleInteractive.focus(); // otherwise the screen display of it doesn't update!
		// in case it's been disabled other than by clickign the button i.e. if a batch search was initiated
	},
	disableCrossHairSearch:function(){
		this.racquelSearchDijit.disableSearch();
		this._btnToggleInteractive.checked = false; 
		this._btnToggleInteractive.focus(); // otherwise the screen display of it doesn't update!
	},
	activateBatchSearch: function(){ // this function is called by onClick on the toolbar
		// this will open a batch search dijit which will allow drag and drop of a csv file
		// in HTML5 browsers and then run multiple racquel searches based on its contents
		if (!window.File || !window.FileReader){
			alert("Your web browser doesn't support the necessary features for running a batch search. \n\r"+
					"Please upgrade to Google Chrome (for best performance) or Firefox");
			return;
		}
		console.log("Activate batch search");
		this.disableInteractiveSearch();
		this.racquelBatchDijit.showDialog();
	},
	
	loadExternalScript:function(scripturl,checkstring){
		console.log("Attempting to load library "+scripturl+"... loading will be considered complete when "
			+checkstring+" object exists");
		var def = new dojo.Deferred();
		if ((typeof window[checkstring] == 'undefined') && !window['loading' + checkstring]) {
			window['loading'+checkstring]=true;
			dojo.io.script.get({
				url: scripturl,
				checkString: checkstring,
				load: function(){
					console.log("Library "+scripturl+" loaded, object "+checkstring+" now available");
					def.callback();
				}
			});
		}
		else if (typeof window[checkstring]=='undefined'){
			// do nothing, it has been called to load but has not yet loaded
			console.log("Repeated call to load "+scripturl+" but it is already attempting to load");
		}
		else {
			// it is already loaded
			console.log("Library "+scripturl+" is already loaded, no need to reload");
			def.callback();
		}
		return def;
		
	},
})
