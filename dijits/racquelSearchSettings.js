dojo.provide("racquelDijits.racquelSearchSettings");
dojo.declare("racquelDijits.racquelSearchSettings",[],{
	constructor:function(params){
		this._availableExtractionParams = params.serviceConfig.racquelCatchmentService.AvailableExtractionParams;
		
		this._isSite = true;
		this._isRoute = true;
		this._isCatchment = true;
		this._extractionParams = {};
		// use all available by default
		for (param in this._availableExtractionParams){
			if (this._availableExtractionParams.hasOwnProperty(param)){
				this._extractionParams[param] = true;
			}
		}
		//this._isElev = true;
		//this._isLCM2K = true;
		//this._isUpstream = true;
		//this._qcCatchment = true;
		//this._useNetLoc = true;
	},
	
	setSite:function(onoff){
		if (onoff){
			this._isSite = true;
		}
		else {
			this._isSite = false;
		}
		return this._isSite;
	},
	setRoute:function(onoff){
		if (onoff){
			this._isRoute = true;
		}
		else { this._isRoute = false;}
		return this._isRoute;
	},
	setCatchment:function(onoff){
		if(onoff){
			this._isCatchment = true;
		}
		else {
			this._isCatchment = false;
		}
		return this._isCatchment;
	},
	setExtractionParam: function(param,onoff){
		if (this._availableExtractionParams[param]){
			this._extractionParams[param] = onoff;
		}
		else {console.debug("Unknown extraction parameter "+param);}
	},
	/*setUpstream:function(onoff){
		if (onoff && this._isCatchment){
			this._isUpstream = true;
		}
		else {
			this._isUpstream = false;
		}
	},
	setCatchmentQC:function(onoff){
		if (onoff && this._isCatchment && this._isRoute){
			this._qcCatchment = true;
		}
		else{
			this._qcCatchment = false;
		} 
	},*/
	setUseNetLoc:function(onoff){
		if (onoff && this._isRoute){
			this._useNetLoc = true;
		}
		else {
			this._useNetLoc = false;
		}
	},
	doSite:function(){ return this._isSite;},
	doRoute: function(){ return this._isRoute;},
	doCatchment: function() { return this._isCatchment;},
	getCatchmentParams: function() {return this._extractionParams;},
	//doElev: function() { return this._isElev;},
	//doLCM2K: function() { return this._isLCM2K;},
	//doUpstream: function() {return this._isUpstream;},
	//doCatchmentQC: function() {return this._qcCatchment;},
	useNetLocation: function() {return this._useNetLoc;}
	
});

