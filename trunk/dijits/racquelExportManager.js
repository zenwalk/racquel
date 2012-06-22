dojo.provide("racquelDijits.racquelExportManager");

dojo.declare("racquelDijits.racquelExportManager",[],{
	constructor: function(params){
		
	},
	_loadScript: function(scriptsrc,loaderCallback){
	// this is a fairly unreliable way of doing it, I'm more familiar with dojo.require but that's not
	// used in this package
	var fileref = document.createElement('script');
	fileref.setAttribute("type","text/javscript");
	fileref.setAttribute("src",scriptsrc);
	fileref.onload = function(){
		loaderCallback();
	};
	fileref.onreadystatechange = function(){
		if (this.readyState == 'complete'){
			loaderCallback();
		}
	};
	document.getElementsByTagName("head")[0].appendChild(fileref);
}
})
