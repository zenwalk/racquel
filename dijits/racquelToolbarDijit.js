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
	racquelServiceConfig: new racquelDijits.racquelServiceConfig(),
	
	constructor:function(params){
		// racquelToolbar is interested in two paramaters that determine its behaviour: map, and resultDiv
		params = params || {};
		// first set up the things we always need regardless of parameters
		// Result store: load results from last time, if there are any and the browser supports it
		this.racquelResultStore = new racquelDijits.racquelResultStore();
		this.canDoBatchSearch = (window.File && window.FileReader);
		this.canSaveResults = window.localStorage !== 'undefined';
		
		// always use a batch search dijit
		this.racquelBatchDijit = new racquelDijits.racquelBatchDijit({racquelToolbar:this});
		// we always need site, route, and catchment search dijits, but the site one can be instantiated with or 
		// without a map.
		// routeSearch and catchmentSearch do not care about map
		this.racquelRouteDijit = new racquelDijits.routeSearch({
			serviceConfig: this.racquelServiceConfig
		});
		this.racquelCatchDijit = new racquelDijits.catchmentSearch({
			serviceConfig:this.racquelServiceConfig
		});
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
			this.racquelInteractiveSettings = new racquelDijits.racquelSearchSettings({
				serviceConfig: this.racquelServiceConfig
			}); // new object will be set to use all
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
			//	if (window.localStorage){
			//		window.localStorage.removeItem("racquelPersistedResults");
			//	}
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
			reloadPane.set('content',content);
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
			//reloadPane.appendChild(yesbutton.domNode);
			//reloadPane.appendChild(nobutton.domNode);
			//this._racquelWelcomeDialog.appendChild(reloadPane);
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
		reloadPane.startup();
		this._racquelReloadContent.set('content',reloadPane.domNode);
		//dojo.place(reloadPane.domNode,this._racquelReloadContent.domNode);
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
