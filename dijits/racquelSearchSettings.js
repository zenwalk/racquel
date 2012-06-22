dojo.provide("racquelDijits.racquelSearchSettings");
dojo.declare("racquelDijits.racquelSearchSettings",[],{
	constructor:function(params){
		this._isSite = true;
		this._isRoute = true;
		this._isCatchment = true;
		//var loadParamsDef = params.serviceConfig._getExtractionParameters(params.serviceSet);
	//	loadParamsDef.then(dojo.hitch(this,function(){
		this._availableExtractionParams = {
			error:"Catchment configuration parameters have not loaded yet. Please try again."
		};
		//this._availableExtractionParams = params.serviceConfig.racquelCatchmentService.AvailableExtractionParams;
		this._currentExtractionParams = {};
	},
	startup:function(){
	//	this.getExtractionParameters();
	},
	getExtractionParameters:function(serviceSet){
		// Function to find out what variables are availalbe for extraction on the catchment service
		// so that the settings dialog can be populated accordingly.
		// The watershed SOE has a desribeLayers operation to support this.
		// serviceSet is one of the objects contained in racquelServiceConfig or more ideally
		// defined in something that is retrieved from the server
		var soeRequestContent = {};
		soeRequestContent['f'] = "json";
		var retrieveParametersDef = new dojo.Deferred();
		if (this._availableExtractionParams.hasOwnProperty("error")){
				esri.request({
			url:serviceSet.racquelCatchmentService.URL + serviceSet.racquelCatchmentService.retrieveLayersOperation,
			content:soeRequestContent,
			load:(dojo.hitch(this,function(response){
				//this.racquelCatchmentService.AvailableExtractionParameters = response;
				this.processCatchmentConfiguration(response);
				retrieveParametersDef.callback(this._availableExtractionParams);
			})),
			error:dojo.hitch(this,function(response){
				this.processCatchmentConfigError(response);
				retrieveParametersDef.callback(this._availableExtractionParams);
			})
		});
		}
		else {
			retrieveParametersDef.callback(this._availableExtractionParams);
		}
		return retrieveParametersDef;
	},
	processCatchmentConfiguration:function(response){
		// in _availableExtractionParams we define the parameters that are available with the SOE - see the 
		// REST directory for the service it's being called on
		// The name of each parameter is the URL parameter name required, it will either be called as true or false.
		// The associated value with each parameter contains a name parameter which will define what the results
		// are called when displayed. The type parameter tells the display code how to summarise the results and
		// what sort of fields the SOE will return:
		// - Categorical: one field for each category; get the percentages, 
		// - Continuous: one field for each of max, min, mean. 
		// - Point Features: display the count, possibly broken down by category.
		// - Line Features: display the count and total length, possibly broken down by category.
		// - Polygon Features: display the count and total area, possibly broken down by category.
		// Finally the responsePrefix parameter which tells it which fields in the SOE result correspond with this 
		// dataset (the SOE results are returned as a single unstructured object).
		var availableParameters = response["Extractions"];
		this._availableExtractionParams = availableParameters;
	},
	processCatchmentConfigError:function(){
		this._availableExtractionParams = {
			error:"No variables were retrieved"
		};
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
			this._currentExtractionParams[param] = onoff;
		}
		else {console.debug("Unknown extraction parameter "+param);}
	},
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
	getCatchmentParams: function() {return this._currentExtractionParams;},
	getAvailableParams: function() {return this._availableExtractionParams;},
	//doCatchmentQC: function() {return this._qcCatchment;},
	useNetLocation: function() {return this._useNetLoc;}
});

