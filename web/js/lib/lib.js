var init_lib = false;
var urlXtraVar = [];
var hyperic = {};
hyperic.URLS = {}; hyperic.widget = {}; hyperic.utils = {}; hyperic.html = {}; hyperic.data = {}; hyperic.i18n = {}; hyperic.config = {};

/**
 * init the library
 */
(function(){
  if(!init_lib){
        init_lib = true;
  }
  hyperic.config.uniqueIndex = 0;
})();

hyperic.html = {
    show : function(/*String*/ node){
        dojo.html.setStyle(node, 'display', '');
    },
    hide : function(/*String*/ node){
        dojo.html.setStyle(node, 'display', 'none');
    }
};

hyperic.form = {
    fieldFocus : function(/*DOMNode*/elem) {
        if (!elem.getAttribute('readonly')) {
            if (elem.parentNode.className == "fieldRow hint")
                elem.parentNode.className = "fieldRow hint active";
            else
                elem.parentNode.className = "fieldRow active";
        }
    },
    fieldBlur : function(elem) {
        if (elem.parentNode.className == "fieldRow hint active")
            elem.parentNode.className = "fieldRow hint";
        else
            elem.parentNode.className = "fieldRow";
    }
};

/**
 * @deprecated
 */
hyperic.utils.key = {
    enterKeyHandler : function(evt) {
        if (evt){}
        else
            evt = window.event;
        if (window.event) {
            evt.cancelBubble = true;
            evt.returnValue = false;
        } else {
            evt.preventDefault();
            evt.stopPropagation();            
        }
        if (evt.keyCode == 13) {
            dojo.event.topic.publish('enter', [evt]);
        }
    },
    registerListener : function(/*DOMNode*/node, /*fp*/handler){
        if (handler && node) {
            dojo.event.connect(node, 'onkeyup', handler);
            /*
            if (dojo.isIE) {
                node.attachEvent("keyup", handler);
            } else {
                node.addEventListener("keyup", handler, false);
            }*/
        }
    }
};


/**
 * Get an DOM Id that is unique to this document
 */
hyperic.utils.getUniqueId = function(/*String*/ prefix){
    if(prefix)
        return prefix + hyperic.config.uniqueIndex++ +"";
    else
        return "unique" + hyperic.config.uniqueIndex++ +"";
};

/**
 * Register a key listener and publish the event on the specified topic
 * @param node A DOM object 
 * @param modKeys an Object with 4 keys: keyCode, ctrlKey, altKey and shiftKey
 * @param topic String name of the topic
 * 
 * To cancel the listener just call the cancel method on the object
 * 
 * Example: addKeyListener(window, {keyCode: 83, ctrl :true}, 'search');
 * which registers a 'ctrl-s' key listener on the window
 */
hyperic.utils.addKeyListener = function(/*Node*/node, /*Object*/ keyComb, /*String*/topic){
    this.node = node;
    this.keyComb = keyComb;
    this.topic = topic;
    this.canceled = false;
    this.keyListener = function(e){
        if(e && e.keyCode == this.keyComb.keyCode && !this.canceled){
            if(this.keyComb.ctrl || this.keyComb.alt || this.keyComb.shift){
                if (e.ctrlKey || e.altKey || e.shiftKey){
                    this.publish(e);
                }else{
                    return;
                }
            }else{
                this.publish(e);
            }
        }
    };
    this.publish = function(e){
        if(window.event){
            e.cancelBubble = true;
            e.returnValue = false;
        }else{
            e.preventDefault();
            e.stopPropagation();
        }
        dojo.event.topic.publish(this.topic, [e]);
    };
    this.cancel = function(){
        this.canceled = true;
        dojo.event.disconnect(node, "onkeyup", this, this.keyListener);
        delete this;
    };
    //dojo.connect(node, "onkeyup", this, this.keyListener);
    dojo.event.connect(node, "onkeyup", this, this.keyListener);
    return this;
};

hyperic.utils.addUrlXtraCallback = function(plugin_id, fn) {
    if(!urlXtraVar[plugin_id])
        urlXtraVar[plugin_id] = [];
    urlXtraVar[plugin_id].push(fn);
};

hyperic.utils.passwd = {
    /**
     * Password strength meter
     * Params are keys in kwArgs
     * 
     * @param node [Node] - text node that contains the pw, has a .value property
     * @param password [String] (optinal)
     * @param updateNode [Node] - the node to update, has a .innerHTML property
     * @param minimumChars (optional) defaults to 6
     * 
     * @return the localize string representing very weak - strong
     */
    assignStrength : function(kwArgs){
        var desc = [];
        desc[0] = hyperic.i18n.html.vweak; //"Very Weak";
        desc[1] = hyperic.i18n.html.weak; //"Weak";
        desc[2] = hyperic.i18n.html.medium; //"Medium";
        desc[3] = hyperic.i18n.html.strong; //"Strong";

        var score   = 0;

        //if password bigger than 6 give 1 point
        if (password.length > 6) score++;

        //if password has both lower and uppercase characters give 1 point      
        if ( ( password.match(/[a-z]/) ) && ( password.match(/[A-Z]/) ) ) score++;

        //if password has at least one number give 1 point
        if (password.match(/\d+/)) score++;

        //if password has at least one special caracther give 1 point
        if ( password.match(/.[!,@,#,$,%,^,&,*,?,_,~,-,(,)]/) ) score++;

        //if password bigger than 12 give another 1 point
        if (password.length > 12) score++;
         document.getElementById("passwordDescription").innerHTML = desc[score];
         document.getElementById("passwordStrength").className = "strength" + score;
    }
};

hyperic.widget.search = function(/*Object*/ urls, /*number*/ minStrLenth, /*Object*/ keyCode){
    dojo.require('dojo.io');
    dojo.require('dojo.lfx.html');
    this.opened     = false;
    this.minStrLen  = minStrLenth; 
    this.resourceURL= urls.resource;
    this.searchURL  = urls.search;
    this.keyCode    = keyCode;
    /**
     * Connect all the events up and grab the nodes that we are going to need
     */
    this.create = function(){
        this.searchBox          = dojo.byId('searchBox');
        this.searchContainer    = dojo.byId('headerSearchBox');
        this.nodeSearchResults  = dojo.byId('headerSearchResults');
        this.nodeCancel         = dojo.byId('searchClose');
        this.nodeSearchButton   = dojo.byId("headerSearch");
        //Set up the key listeners for the search feature
        new hyperic.utils.addKeyListener(window, this.keyCode, 'search');
        new hyperic.utils.addKeyListener(this.searchContainer, {keyCode: 13}, 'enter');
        new hyperic.utils.addKeyListener(dojo.byId('header'), {keyCode: 27}, 'escape');
    };
    this.search = function(e){
        var string = e.target.value;
        if(this.searchBox.value.length >= this.minStrLen){
            this.searchStarted();
            dojo.io.bind( {
                url: this.searchURL+'?q='+string, 
                method: "post",
                handleAs: "json",
                timeout: 5000, 
                handle: loadSearchData,
                error: this.error,
                mimetype:'text/json'
            });
            
           
        }else{
            this.searchEnded();
            this.nodeSearchResults.style.display = 'none';
        }
    };
    this.error = function(){
        this.searchEnded();
        alert("foo");
    };
    this.loadResults = function(response){
        this.searchEnded();
        
    };
    this.toggleSearchBox = function() {
        if(this.opened) {
            this.nodeSearchResults.style.display = 'none';
            dojo.lfx.html.wipeOut([this.searchContainer], 400).play();
            //dojo.fx.wipeOut({node:this.searchContainer, duration: 400}).play();
            this.opened = false;
            this.searchEnded();
            this.searchBox.value = '';
        }
        else {
            window.scrollTo(0,0);
            dojo.lfx.html.wipeIn([this.searchContainer], 400).play();
            //dojo.fx.wipeIn({node:this.searchContainer, duration: 400}).play();
            this.opened = true;
            this.searchBox.focus();
        }
    };
    this.searchStarted = function(){
        this.searchBox.className = "searchActive";
    };
    this.searchEnded = function(){
        this.searchBox.className = "";
    };
    return this;
};

function loadSearchData(type, response, evt) {
    if(type == 'load'){
        var resURL = resourceURL+"?eid=";
        var template = "<li><a href='link' class='type'>text<\/a><\/li>";
        var count = 0;
        var res = "";
        var relink = new RegExp("link", "g");
        var retext = new RegExp("text", "g");
        var retype = new RegExp("type", "g");
        for(var i in response) {
            var length = response[i].name.length;
            if(length >= 37){
                response[i].name = response[i].name.substring(0,4) + "..." + response[i].name.substring(length-28, length);
            }
            res += template.replace(relink, resURL+response[i].eId).replace(retext, response[i].name).replace(retype, response[i].resType);
            count++;
        }
        dojo.byId("resourceResults").innerHTML = res;
        dojo.byId("resourceResultsCount").innerHTML = count;
        dojo.byId('headerSearchResults').style.display = '';
        dojo.byId('searchBox').className = "";
    }
}

/**
 *
 * @args kwArgs - keys 
 *
 *
 */
hyperic.widget.Menu = function(kwArgs) {
    var that = this;
    that.show = function(node){
    };
    that.onclick = function(evt) {
        if(!this._isVisible) {
            var x,y;
            var node = evt.target;
            if(this._isSubMenu) {
                //put it on the right
                x=node.offsetLeft+node.clientWidth+12;
                y=node.clientHeight+node.offsetTop+4;
            }else {
                //put it underneath
                x=node.offsetLeft;
                y=node.clientHeight+node.offsetTop;
            }
            this.node.style['top'] = y+'px';
            this.node.style['left'] = x+'px';
            this.node.style.display = 'block';
            this._isVisible = true;
            if(this._isSubMuenu)
                this.isFocused = true;
        }
    };
    this.onUnHover = function() {
        if(this.child){
            if(!this.child.isFocused){
            }else{
                this.node.style.display = 'none';
                this.isFocused = false;
                this._isVisible = false;
            }
        }else{
           this.node.style.display = 'none';
           this.isFocused = false;
            this._isVisible = false;
        }

    };
    this.onHover = function() {
        this.isFocused = true;
    };
    this._init = function(kwArgs) {
        if(kwArgs.child) {
            this.child = kwArgs.child;
        }
        var that = this;
        if(kwArgs.menuNode) {
            this.node = kwArgs.menuNode;
            this.node.style.display='none';
            dojo11.connect(this.node, 'onmouseenter', that, 'onHover');
            dojo11.connect(this.node, 'onmouseleave', that, 'onUnHover');
        }
        if(kwArgs.toggleNode) {
            if(kwArgs.subMenu){
                this._isSubMenu = true;
                dojo11.connect(kwArgs.toggleNode, 'onmouseover', that, 'onclick');
            }else{
                dojo11.connect(kwArgs.toggleNode, 'onclick', that, 'onclick');
            }
        }
        
    }; 
    this.isFocused = false;
    this._isVisible = false;
    this._init(kwArgs);
};


/* OLD REPORTING */

function init_reporting(){
    dojo.require("dojo.widget.DropdownDatePicker"); 
    dojo.require("dojo.widget.HtmlWidget");
    dojo.require("dojo.widget.ValidationTextbox");
    dojo.require("dojo.io");
    dojo.require("dojo.json");
    dojo.require("dojo.event");
    
    dojo.event.connect(window, "onload", function(){
        var reportList = dojo.byId("reports");
        if(reportList){
            reportList.selectedIndex = 0;
            selectedChanged(reportList);
        }
    });
}

hyperic.hq = {};
hyperic.hq.reporting = {};
hyperic.hq.dom = {};

hyperic.hq.dom.datePickerProps = {
    displayWeeks : "6",
    inputWidth : "15em",
    formatLength : "full",
    templateString : '<div class="fieldRow" dojoAttachPoint="fieldRowContainerNode">\n\t<label for="${this.widgetId}">\n\t\t<span class="fieldLabel ${this.fieldRequiredClass}"><img src="/images/icon_required.gif" height="9" width="9" border="0"><span dojoAttachPoint="fieldLabel">${this.label}</span></span>\n\t</label>\n\t\t<div class="fieldValue" dojoAttachPoint="fieldWrapper">\n\t\t<span style=\"white-space:nowrap\"><input type=\"hidden\" name=\"\" value=\"\" dojoAttachPoint=\"valueNode\" /><input name=\"\" type=\"text\" value=\"\" style=\"vertical-align:middle;\" dojoAttachPoint=\"inputNode\" dojoAttachEvent=\"onclick:onIconClick\" readonly=\"readonly\" autocomplete=\"off\" /> <img src=\"${this.iconURL}\" alt=\"${this.iconAlt}\" dojoAttachEvent=\"onclick:onIconClick\" dojoAttachPoint=\"buttonNode\" style=\"vertical-align:middle; cursor:pointer; cursor:hand\" /></span>\n<div dojoattachpoint="validationMessage" class="errorMsg"></div></div>\n</div>',
    value : new Date(),
    StartDate : new Date(1-1-2000)
};
    
hyperic.hq.dom.validationTextboxProps = {
    id : "ValidationWidget1",
    type : 'text',
    required : true,
    missingClass : "",
    size : 23,
    maxlength : 60,
    missingMessage : "",
    requiredMessage : "this value is required",
    listenOnKeyPress : false,
    templateString : '<div class="fieldRow" dojoAttachPoint="fieldRowContainerNode">\n\t<label for="${this.widgetId}">\n\t\t<span class="fieldLabel ${this.fieldRequiredClass}"><img src="/images/icon_required.gif" height="9" width="9" border="0"><span dojoAttachPoint="fieldLabel">${this.label}</span></span>\n\t</label>\n\t\t<div class="fieldValue" dojoAttachPoint="fieldWrapper">\n\t\t<span style="float:${this.htmlfloat};">\n\t\t<input dojoAttachPoint="textbox" type="${this.type}" dojoAttachEvent="onblur;onfocus;onkeyup" id="${this.widgetId}" name="${this.name}" size="${this.size}" maxlength="${this.maxlength}" class="${this.className}" style="">\n\t\t\t<div dojoAttachPoint="invalidSpan" class="${this.invalidClass}">&nbsp;-&nbsp;${this.messages.invalidMessage}</div>\n\t\t<div dojoAttachPoint="missingSpan" class="${this.missingClass}">&nbsp;-&nbsp;${this.messages.missingMessage}</div>\n\t\t<div dojoAttachPoint="rangeSpan" class="${this.rangeClass}">&nbsp;-&nbsp;${this.messages.rangeMessage}</div>\n\t\t</span>\n</div>\n</div>',
    templateCssString : ".dojoValidateEmpty{}\n.dojoValidateValid{}\n.dojoValidateInvalid{}\n.dojoValidateRange{}\n"
};

hyperic.hq.dom.selectboxProps = {
   templateCssString : ".dojoComboBoxOuter {\n\tborder: 0px !important;\n\tmargin: 0px !important;\n\tpadding: 0px !important;\n\tbackground: transparent !important;\n\twhite-space: nowrap !important;\n}\n\n.dojoComboBox {\n\tborder: 1px inset #afafaf;\n\tmargin: 0px;\n\tpadding: 0px;\n\tvertical-align: middle !important;\n\tfloat: none !important;\n\twidth:172px;height:14px;position: static !important;\n\tdisplay: inline !important;\n}\n\n/* the input box */\ninput.dojoComboBox {\n\tborder-right-width: 0px !important; \n\tmargin-right: 0px !important;\n\tpadding-right: 0px !important;\n}\n\n/* the down arrow */\nimg.dojoComboBox {\n\tborder-left-width: 0px !important;\n\tpadding-left: 0px !important;\n\tmargin-left: 0px !important;height:15px;\n}\n\n/* IE vertical-alignment calculations can be off by +-1 but these margins are collapsed away */\n.dj_ie img.dojoComboBox {\n\tmargin-top: 1px; \n\tmargin-bottom: 1px; \n}\n\n/* the drop down */\n.dojoComboBoxOptions {\n\tfont-family: Verdana, Helvetica, Garamond, sans-serif;\n\t/* font-size: 0.7em; */\n\tbackground-color: white;\n\tborder: 1px solid #afafaf;\n\tposition: absolute;\n\tz-index: 1000; \n\toverflow: auto;\n\tcursor: default;width:200px;\n}\n\n.dojoComboBoxItem {\n\tpadding-left: 2px;\n\tpadding-top: 2px;\n\tmargin: 0px;\n}\n\n.dojoComboBoxItemEven {\n\tbackground-color: #f4f4f4;\n}\n\n.dojoComboBoxItemOdd {\n\tbackground-color: white;\n}\n\n.dojoComboBoxItemHighlight {\n\tbackground-color: #63709A;\n\tcolor: white;\n}\n",
   templateString : '<div class="fieldRow"><label for="${this.widgetId}"><span class="fieldLabel ${this.fieldRequiredClass}"><img width="9" height="9" border="0" src="/images/icon_required.gif"/><span dojoAttachPoint="fieldLabel">${this.label}</span></span></label><div class="fieldValue" dojoAttachPoint="fieldWrapper"><span class=\"dojoComboBoxOuter\"\n\t><input style=\"display:none\"  tabindex=\"-1\" name=\"\" value=\"\" \n\t\tdojoAttachPoint=\"comboBoxValue\"\n\t><input style=\"display:none\"  tabindex=\"-1\" name=\"\" value=\"\" \n\t\tdojoAttachPoint=\"comboBoxSelectionValue\"\n\t><input type=\"text\" autocomplete=\"off\" class=\"dojoComboBox\"\n\t\tdojoAttachEvent=\"key:_handleKeyEvents; keyUp: onKeyUp; compositionEnd; onResize;\"\n\t\tdojoAttachPoint=\"textInputNode\"\n\t><img hspace=\"0\"\n\t\tvspace=\"0\"\n\t\tclass=\"dojoComboBox\"\n\t\tdojoAttachPoint=\"downArrowNode\"\n\t\tdojoAttachEvent=\"onMouseUp:handleArrowClick; onResize;\"\n\t\tsrc=\"${this.buttonSrc}\"></img></span>\n<div dojoattachpoint="validationMessage" class="errorMsg"></div></div></div></div>',
   mode : 'local',
   autoComplete : true,
   fieldRequiredClass : "required",
   forceValidOption : true,
   maxListLength : 10
};

hyperic.hq.dom.createDatePicker = function(datePickerName){
    hyperic.hq.dom.datePickerProps.label = datePickerName;
    hyperic.hq.dom.datePickerProps.name = datePickerName;
    hyperic.hq.dom.id = datePickerName;
    var parentNode =  document.createElement('div');
    parentNode.id = dojo.dom.getUniqueId();
    dojo.byId("reportOptions").appendChild(parentNode); 
    var calendarWidget = dojo.widget.createWidget("dropdowndatepicker", hyperic.hq.dom.datePickerProps, parentNode);
    calendarWidget.inputNode.id = calendarWidget.widgetId;
    hyperic.hq.reporting.manager.currentReportOptions.push(calendarWidget);
};

hyperic.hq.dom.createTextBox = function(textboxName){
    hyperic.hq.dom.validationTextboxProps.label = textboxName;
    hyperic.hq.dom.validationTextboxProps.name = textboxName;
    var parentNode =  document.createElement('div');
    parentNode.id = dojo.dom.getUniqueId();
    dojo.byId("reportOptions").appendChild(parentNode); 
    var validationWidget = dojo.widget.createWidget("ValidationTextbox", hyperic.hq.dom.validationTextboxProps, parentNode);
    hyperic.hq.reporting.manager.currentReportOptions.push(validationWidget);
    return validationWidget;
};

hyperic.hq.dom.createSelectBox = function(selectboxName, optionsArray){
    this.option = function(name, value){
        return "<option value='" + value + '">' + name + "</option>";
    };
    var select = document.createElement('select');
    select.id = "temp";
    var option = document.createElement('option'); 
    option.value = "-1";
    option.innerHTML = "All Resources";
    select.appendChild(option);
    for(var i =0; i < optionsArray.length; i++){
        option = document.createElement('option');
        option.value = optionsArray[i].id;
        option.innerHTML = optionsArray[i].name;
        select.appendChild(option);
    }
    dojo.byId("reportOptions").appendChild(select);
    hyperic.hq.dom.selectboxProps.label = selectboxName;
    var selectWidget = dojo.widget.createWidget("ComboBox", hyperic.hq.dom.selectboxProps, select);
    selectWidget.textInputNode.id = selectWidget.widgetId;
    selectWidget.dataProvider.searchLimit = optionsArray.length + 1;
    selectWidget.domNode = selectWidget.textInputNode;
    hyperic.hq.reporting.manager.currentReportOptions.push(selectWidget);
};

hyperic.hq.reporting.manager = { 
    currentReportOptions : [], 
    preSubmit : function(){
        var submit = this.validateReportOptions();
        if(submit){
            this.serializeReportOptions();
            //dojo.byId("ReportingForm").submit();
            var mp = dojo.byId("messagePanel");
            if(mp){
                mp.style.display="none";
            }
            return true;
        }else{
            return false;
        }
    },
    serializeReportOptions : function(){
        var obj = "{";
        for(var i = 0; i < this.currentReportOptions.length; i++){
            if(this.currentReportOptions[i].getDate){
                obj += '"' + this.currentReportOptions[i].name + '":"' +  this.currentReportOptions[i].getDate().getTime() +'",'; 
            }else if(this.currentReportOptions[i].getState){
                var value = this.currentReportOptions[i].comboBoxSelectionValue.value;
                if(dojo.render.html.ie){
                    obj += '"' + this.currentReportOptions[i].label + '":"' + value +'",';
                }else{
                    obj += '"' + this.currentReportOptions[i].label + '":"' + value +'",';
                }
            }else if(this.currentReportOptions[i].textbox){
                obj += '"' + this.currentReportOptions[i].name + '":"' +  this.currentReportOptions[i].getValue() +'",';
            }
        }
        obj += "}";
        dojo.byId("jsonData").value = obj;
    },
    validateReportOptions : function(){
        var submit = true;
        var dates ={};
        for(var i =0; i < this.currentReportOptions.length; i++){
            if(this.currentReportOptions[i].getDate){
                if(this.currentReportOptions[i].label == "Start Date" ||
                    this.currentReportOptions[i].label == "StartDate"){ 
                    dates.StartDate = this.currentReportOptions[i].getDate();
                    dates.StartDateNode = this.currentReportOptions[i];
                }else{
                    dates.EndDate = this.currentReportOptions[i].getDate();
                    dates.EndDateNode = this.currentReportOptions[i];
                }
                if(this.currentReportOptions[i].inputNode.value === ''){
                    this.currentReportOptions[i].fieldWrapper.className += ' error';
                    this.currentReportOptions[i].validationMessage.innerHTML = "&nbsp;-&nbsp;this field is required ";
                    submit = false && submit;
                }else{
                    this.currentReportOptions[i].fieldWrapper.className = 'fieldValue';
                    this.currentReportOptions[i].validationMessage.innerHTML = "";
                    submit = true && submit;                        
                }
            }else if(this.currentReportOptions[i].getState){
                if(this.currentReportOptions[i].getValue() == "" && !this.currentReportOptions[i]._isValidOption()){
                    this.currentReportOptions[i].fieldWrapper.className += ' error';
                    this.currentReportOptions[i].validationMessage.innerHTML = "&nbsp;-&nbsp;this field is required ";
                    submit = false && submit;  
                }else{
                    this.currentReportOptions[i].fieldWrapper.className = 'fieldValue';
                    this.currentReportOptions[i].validationMessage.innerHTML = "";
                    submit = true && submit;
                }
            }else if(this.currentReportOptions[i].getValue && !this.currentReportOptions[i].getState){
                if(this.currentReportOptions[i].textbox.value == ''){
                    this.currentReportOptions[i].fieldWrapper.className += ' error';
                    this.currentReportOptions[i].validationMessage.innerHTML = "&nbsp;-&nbsp;this field is required ";
                    submit = false && submit;                       
                }else{
                    this.currentReportOptions[i].fieldWrapper.className = 'fieldValue';
                    this.currentReportOptions[i].validationMessage.innerHTML = "";
                    submit = true && submit;                        
                }
            }
        }
        if(dates.EndDate && dates.StartDate){
            if(dates.StartDate > dates.EndDate){
                    dates.EndDateNode.fieldWrapper.className += ' error';
                    dates.EndDateNode.validationMessage.innerHTML = '&nbsp;-&nbsp;The "End" date must be earlier than the "Start" date.';
                    submit = false && submit;
            }
        }
        return submit;
    }
};

function resetReportOptions(){
    dojo.byId("reportOptions").innerHTML = "";
    hyperic.hq.reporting.manager.currentReportOptions = [];
    //TODO iterate through and call destroy
}

function selectedChanged(selectNode){
    //get the changed object
    //send to the server
    //inner html the response after checking the validity
    var selected;
    var textNode;
    var textTargetNode = dojo.byId("reportDetails");
    if(selectNode){
        selected = selectNode.options[selectNode.selectedIndex];
        textNode = dojo.byId(selected.value);
        textTargetNode.innerHTML = textNode.innerHTML;
    }
    getReportOptions(selected.value);
}

function getReportOptions(reportName){
    var URL = "/reporting/ReportCenter.do?reportName=" + reportName;
    var request = new dojo.io.Request(URL, "text/plain", "XMLHTTPTransport");
    request.load = function(type, data, evt){
        if(data){ createInputFieldsFromJSON(data); } 
    };
    request.error = function(type, error){};
    dojo.io.bind(request);
}

function createInputFieldsFromJSON(jsonArray){
    resetReportOptions();
    var descriptor = dojo.json.evalJson(jsonArray);
    //for(var key in descriptor){
    var i = 0;
    while(i < descriptor.length){
        // var type = descriptor[key].type;
        var type = descriptor[i]["descriptor"].type;
        if(type !== undefined){
            var o = descriptor[i]['descriptor'];
            if(type.indexOf("String") != -1){
                hyperic.hq.dom.createTextBox(o.name);
            }else if(type.indexOf("Date") != -1){
                hyperic.hq.dom.createDatePicker(o.name);
            }else if(type.indexOf("Group") != -1){
                hyperic.hq.dom.createSelectBox(o.name, o.options);
            }
        } 
        i++; 
    }
}



/**
 * @deprecated used only for the struts header
 */
function activateHeaderTab(){
    var l = document.location;
    l = l+""; // force string cast
    if(l.indexOf("Dash")!=-1)
        dojo.byId("dashTab").className = "active";
    if(l.indexOf("Resou")!=-1)
        dojo.byId("resTab").className = "active";
    if(l.indexOf("rep")!=-1 || l.indexOf("Rep")!=-1 || l.indexOf("masth")!=-1)
        dojo.byId("analyzeTab").className = "active";
    if(l.indexOf("admin")!=-1 || l.indexOf("Adm")!=-1)
        dojo.byId("adminTab").className = "active";
}


hyperic.widget = hyperic.widget || {};

/**
* Chart - timeplot chart manager functionality. Creates and manages dom and datasource for timeplot
*
* @param node
* @param kwArgs
*/
// hyperic.widget.Chart = function(node, kwArgs, tabid, chartPos, singleChart) {
  hyperic.widget.Chart = function(node, kwArgs) {
    var that = this;
    that.subscriptions=[];
    that.create = function(node, kwArgs) {
        
        var template = '<div class="chartCont"> <h3 class="cTitle">' + kwArgs.name + '</h3><div id="widget_chart"></div><div class="xlegend"></div></div>';
        that.template = template;
        // that.tabid = tabid;
        that.node = dojo11.byId(node);
        that.name = kwArgs.name;
        //console.log("created chart: "+kwArgs.name);
        that.node.innerHTML = template;
        // dojo11.byId(node).appendChild(f.firstChild);
        // that.url = kwArgs.url;
        that.data = kwArgs.data;
        // that.chartPos = chartPos;
        //chartObjs[tabid] = that;
        // that.node = dojo11.byId(tabid);
        // that.subscriptions[0] = dojo11.subscribe('tabchange', that, 'showChart');
        //TODO check if the tab that is currently selected is the one that is getting the chart.
        // f=null;
        };
    that.showChart = function() {
        // if(arg == that.tabid){
            if (!that.isShowing) {
                //create chart
                that.dataSource = new Timeplot.DefaultEventSource();
                var pi = [Timeplot.createPlotInfo( {
                    id : "plot1", dataSource : new Timeplot.ColumnSource(that.dataSource, 1), valueGeometry : new Timeplot.DefaultValueGeometry( {
                        gridColor : "#000000", axisLabelsPlacement : "left" }
                    ), timeGeometry : new Timeplot.DefaultTimeGeometry( {
                        gridColor : new Timeplot.Color("#DDDDDD"), axisLabelsPlacement : "bottom" }
                    ), showValues : true, lineColor : "#00EB08", roundValues:false, //00EB08 89EB0F
                    fillColor : "#00B93A" //#E6FCCA
                    }
                )];
                that.chart = Timeplot.create(dojo11.byId("widget_chart"), pi);
                // that.chart.loadText(that.url, ",", that.dataSource);
                that.chart.loadJSON(that.data, that.dataSource);
                that.isShowing = true;
            }
        // }
    };

    // this.update = function(kwArgs) {
    //   console.log('trying to update chart view');
    //   that.name = kwArgs.name;
    //   that.url = kwArgs.url;
    // 
    //   var titleHeader = dojo11.query('.cTitle', that.node)[0];
    //   while(titleHeader.lastChild) {
    //     titleHeader.removeChild(titleHeader.lastChild);
    //   }
    //   titleHeader.appendChild(document.createTextNode(that.name));
    //   titleHeader = null;
    //   
    //   console.log(that.chart);
    //   // that.chart.dataSource = new Timeplot.ColumnSource(es, 1)
    //   // var es = new Timeplot.DefaultEventSource();
    //   console.log(that.dataSource);
    // 
    //   that.dataSource._clear();
    //   that.chart.loadText(that.url, ",", that.dataSource);
    //   
    //   // console.log(that.chart._plots[0]);
    //   // that.chart._plots[0].hideValues();
    //   // that.chart.update();
    //   that.chart.repaint();
    //   // console.log(that.chart._plots[0]._dataSource);
    // };

    this.cleanup = function(){
        // dojo11.unsubscribe(that.subscriptions[0]);
        
        // destroy all children of the chart container
        while(that.node.lastChild) {
          that.node.removeChild(that.node.lastChild);
        }
        // that.node.parentNode.removeChild(that.node);
        that.node = null;
        };
    //init
    that.isShowing = false;
    // this.create(node, kwArgs, tabid, chartPos);
    this.create(node, kwArgs);
    this.showChart();
};

// set up the dashboard widget namespace
hyperic = hyperic || {}; 
/** 
 * @namespace
 */
hyperic.dashboard = hyperic.dashboard || {}; 


/**
 * common hyperic dashboard widget functions
 *
 * @author Anton Stroganov <anton@hyperic.com>
 * @class hyperic.dashboard.widget
 * @requires hyperic.dashboard.widget
 */
hyperic.dashboard.widget = {
    configSheet: null,
    contentSheet: null,
    config: {},

    /**
     * catches clicks on widget, and passes them on to the handler function 
     * determined by the button's class.
     *
     * @param {Event} e
     * @see #clickHandler
     */
    clickHandler: function(e) {
        if(this['click_' + e.target.className])
        {
            e.stopPropagation();
            e.preventDefault();
            dojo11.stopEvent(e);

            this['click_' + e.target.className](e);
        }
    },
    
    /**
     * clicking the config button shows the config layer 
     * @param {Event} e
     * @see #clickHandler
     */
    click_config_btn: function(e,onEnd)
    {
        this.swapSheets(this.contentSheet,this.configSheet,onEnd);
    },

    /**
     * clicking the config layer's cancel button swaps config and 
     * content layers back
     *
     * @param {Event} e
     * @see #clickHandler
     */
    click_cancel_btn: function(e,onEnd)
    {
        this.swapSheets(this.configSheet,this.contentSheet,onEnd);
    },
    
    /**
     * clicking the config layer's save button should make an xhr request
     * to store the data, and swaps the content layer back in
     *
     * @param {Event} e
     * @see #clickHandler
     */
    click_save_btn: function(e)
    {
        throw new Error('You need to implement this widget\'s save config functionality!');
    },
    
    /**
     * cleanup code should happen in the child class, and then invoke this
     * to remove the dashboard portlet from dashboard page.
     */
    click_remove_btn: function(e)
    {
        removePortlet(this.config.portletName, this.config.portletLabel);
    },
    
    /**
     * swap any two layers with a dojo fade-out -> fade-in effect
     * invokes function passed in as 'onEnd' argument after the fade
     *
     * @param {Node} from
     * @param {Node} to
     * @param {function} onEnd
     */
    swapSheets: function(from,to,onEnd) {
        var c = dojo11.fx.chain([
            dojo11.fadeOut({
                node : from, 
                onEnd: function() { 
                        dojo11.style(from,'display','none'); 
                        dojo11.style(to,'display','block'); 
                    } 
                }
            ),
            dojo11.fadeIn({
                node : to
                }
            )
            ]);

        if(onEnd)
        {
            dojo11.connect(c,'onEnd',onEnd);
        }
        c.play();
    },

    /**
     * filter a selectbox to show only the options
     * with names that match the text given.
     *
     * @param {Node} selectbox node
     * @param {Text} search text
     */
    searchSelectBox: function(node,text) {
        dojo11.forEach(
            node.options,
            function(opt)
            {
                // if(opt.text.match(exp))
                if(opt.text.toLowerCase().indexOf(text.toLowerCase()) !== -1)
                {
                    if(opt.disabled === true)
                    {
                        opt.disabled = false;
                        opt.style.display = '';
                    }
                }
                else
                {
                    if(opt.disabled === false)
                    {
                        opt.disabled = true;
                        opt.style.display = 'none';
                    }
                }
            });
    },

    /**
     * add an option to a selectbox in a correct position.
     * to keep the box alphabetically sorted.
     *
     * @param {Node} selectbox node to add option to
     * @param {Node} new option to add do the selectbox
     */
    addOptionToSelect: function(select,option)
    {
        var newLocation = null;
        if(select.options.length > 0)
        {
            for(var i = 0,j = select.options.length; i < j; i++)
            {
                if(select.options[i].text > option.text)
                {
                    newLocation = i;
                    break;
                }
            }
        }
        try {  // standards compliant; doesn't work in IE
            if(newLocation)
            {
                select.add(option, select.options[newLocation]);
            }
            else
            {
                select.add(option, null); // standards compliant; doesn't work in IE
            }
        }
        catch(ex) { // IE only
            if(newLocation)
            {
                select.add(option,newLocation); // IE only
            }
            else
            {
                select.add(option); // IE only
            }
        }
    }
};

/**
 * chartWidget is a widget that displays a chart slideshow
 * 
 * @author Anton Stroganov <anton@hyperic.com>
 * @base hyperic.dashboard.widget
 * @constructor
 */
hyperic.dashboard.chartWidget = function(node, portletName, portletLabel) {
    var that = this;

    that.configSheet = dojo11.query('.config',node)[0];
    that.contentSheet = dojo11.query('.content',node)[0];
    
    that.chartsearch = dojo11.byId('chartsearch');
    that.chartselect = dojo11.byId('chartselect');
    
    that.play_btn = dojo11.query('.pause_btn',node)[0];
    
    that.chart = null;
    that.charts = [];
    that.cycleId = null;
    that.currentChartId = null;
    that.showing = 'content';
    that.needsResize = false;
    that.config = {
        portletName: portletName,
        portletLabel: portletLabel
    };

    /**
     * pause the chart playback before showing the config layer 
     * populate the config form from the config object
     * 
     * @param {Event} e
     * @see #playCharts
     * @see hyperic.dashboard.widget#click_config_btn
     * @see hyperic.dashboard.widget#clickHandler
     */
    this.click_config_btn = function(e)
    {
        that.pauseCharts();
        hyperic.dashboard.widget.click_config_btn.apply(this);
        that.showing = 'config';
        
        var input_rotation = dojo11.byId('chart_rotation');
        var input_interval = dojo11.byId('chart_interval');
        var input_range = dojo11.byId('chart_range');
        if(that.config.rotation == 'true')
        {
            input_rotation.checked = true;
        }
        for(var i = 0; i < input_interval.options.length; i++)
        {
            if(input_interval.options[i].value == that.config.interval)
            {
                input_interval.selectedIndex = i;
                break;
            }
        }
        for(var j = 0; j < input_range.options.length; j++)
        {
            if(input_range.options[j].value == that.config.range)
            {
                input_range.selectedIndex = j;
                break;
            }
        }
    };

    /**
     * sets the config values from the config form
     * TODO: makes request to store config on server
     * after saving and showing the content layer 
     * - resize chart if necessary
     * - restart chart slideshow playback if rotation is still on
     * 
     * @param {Event} e
     * @see #playCharts
     * @see hyperic.dashboard.widget#click_save_btn
     * @see hyperic.dashboard.widget#clickHandler
     */
    this.click_save_btn = function(e)
    {
        that.config.interval = parseInt(dojo11.byId('chart_interval').value,10);
        that.config.range = dojo11.byId('chart_range').value;
        that.config.rotation = dojo11.byId('chart_rotation').checked ? 'true' : 'false';

        dojo11.xhrGet( {
            url: "/api.shtml?v=1.0&s_id=chart&config=true&tr=" + that.config.range + "&ivl=" + that.config.interval + "&rot=" + that.config.rotation,
            handleAs: 'json',
            load: function(data){
                that.config.interval = parseInt(data.ivl,10) || that.config.interval;
                that.config.range = data.tr || that.config.range;
                that.config.rotation = data.rot || that.config.rotation;
            },
            error: function(data){
                console.debug("An error occurred saving charts config... ", data);
            },
            timeout: 2000
        });


        that.swapSheets(that.configSheet,that.contentSheet,
            function()
            {
                that.showing = 'content';
                if(that.needsResize)
                {
                    that.chartResize();
                }
                if(that.config.rotation == 'true')
                {
                    that.playCharts();
                }
            });
    };

    /**
     * extends parent's behaviour to restart chart slideshow playback
     * after canceling config and showing the content layer 
     * 
     * @param {Event} e
     * @see #playCharts
     * @see hyperic.dashboard.widget#click_cancel_btn
     * @see hyperic.dashboard.widget#clickHandler
     */
    this.click_cancel_btn = function(e)
    {
        hyperic.dashboard.widget.click_cancel_btn.apply(
            this,
            [
                e,
                function()
                {
                    that.showing = 'content';
                    if(that.needsResize)
                    {
                        that.chartResize();
                    }
                    if(that.config.rotation == 'true')
                    {
                        that.playCharts();
                    }
                }
            ]);
    };

    /**
     * a play button click handler to start playback, 
     * and change play button to a pause button. 
     * 
     * @param {Event} e
     * @see #playCharts
     * @see hyperic.dashboard.widget#clickHandler
     */
    that.click_play_btn = function(e) {
        that.playCharts();
    };
    
    /**
     * a pause button click handler to stop playback, 
     * and change pause button to a play button. 
     * 
     * @param {Event} e
     * @see #pauseCharts
     * @see hyperic.dashboard.widget#clickHandler
     */
    that.click_pause_btn = function(e) {
        that.pauseCharts();
    };
    
    /**
     * extends parent's behaviour to pause the chart playback 
     * and cleanup the chart before removing the widget
     * 
     * @param {Event} e
     * @see #pauseCharts
     * @see hyperic.dashboard.widget#click_remove_btn
     * @see hyperic.dashboard.widget#clickHandler
     */
    this.click_remove_btn = function(e)
    {
        that.pauseCharts();
        that.chart.cleanup();
        hyperic.dashboard.widget.click_remove_btn.apply(that);
    };

    /**
     * an event handler to handle onKeyUp events on a search textbox.
     * It filters the chart selectbox of the widget to show only the charts
     * with names that match the text being typed in.
     * 
     * @param {Event} e
     */
    that.search = function(e)
    {
        that.searchSelectBox(that.chartselect,e.target.value);
    };
    
    /**
     * an event handler to handle the onfocus event on the search textbox.
     * It empties it to prepare it for user's input.
     * 
     * @param {Event} e
     */
    that.emptySearch = function(e)
    {
        if(e.target.value == '[ Live Search ]')
        {
            e.target.value = '';
        }
    };
    
    /**
     * an event handler to handle the onblur event on the search textbox.
     * It resets the search textbox to instruction value if it's empty.
     * 
     * @param {Event} e
     */
    that.resetSearch = function(e) 
    {
        if(e.target.value == '')
        {
            e.target.value = '[ Live Search ]';
        }
    };
    
    /**
     * an event handler to handle the onclick event on the chart selectbox.
     * pauses chart playback and swaps the current chart for the newly 
     * selected chart.
     * 
     * @param {Event} e
     */
    that.select = function(e)
    {
        that.pauseCharts();
    
        if(that.currentChartId != e.target.value)
        {
            that.cycleCharts(e.target.value);
        }
    };

    /**
     * swaps a chart for the next chart in the list. 
     * NB: use 'that.' rather than 'this.' keyword here, because when
     * the browser window invokes this function, 'this.' is set to 
     * the window context, rather than the object context.
     *
     * @see #playCharts
     * @see #pauseCharts
     */
    that.cycleCharts = function(chartId)
    {
        // console.info('argument: ' + chartId);
        // console.info('next defined by default, 0');
        var next = 0;
        if(!chartId || chartId < 0 || chartId >= that.chartselect.options.length)
        {
            if(that.chartselect.selectedIndex !== -1 && that.chartselect.selectedIndex != that.chartselect.options.length-1)
            {
                // console.info('next defined by next element from select box selected index ' + that.chartselect.selectedIndex + ' + 1');
                next = that.chartselect.selectedIndex+1;
            }
        }
        else
        {
            // console.info('next defined by passing in argument ' + chartId);
            next = chartId;
        }

        if(that.chart !== null)
        {
            that.chart.cleanup();
        }

        // console.log('next is' + next);

        if(that.charts[next].data)
        {
            that.chart = new hyperic.widget.Chart('chart_container', that.charts[next]);
            that.chartselect.selectedIndex = next;
            that.currentChartId = next;
            chartId = null;
        }
        else
        {
            that.fetchChartData(next).addCallback(
                function()
                {
                    // add a callback to refresh the chart data in a minute
                    that.charts[next].interval = setInterval(that.fetchChartData(next),3600);

                    // console.log('fetched data; next chart id is ' + next);
                    if(that.charts[next].data)
                    {
                        that.chart = new hyperic.widget.Chart('chart_container', that.charts[next]);
                    }
                    else
                    {
                        that.chart = new hyperic.widget.Chart('chart_container', {data: {'0': [0]}, name: that.charts[next].name});
                    }
                    that.chartselect.selectedIndex = next;
                    that.currentChartId = next;
                    chartId = null;
                });
        }
    };
    
    /**
     * display the first chart if no chart is showing, 
     * and start the chart cycle a chart for the next chart in the list. 
     *
     * @see #pauseCharts
     * @see #cycleCharts
     */
    that.playCharts = function() {
        console.log('starting to play');
        that.cycleCharts();
        if(that.cycleId == null) {
            that.cycleId = setInterval(that.cycleCharts, parseInt(that.config.interval,10)*1000);

            // display pause button when playing
            that.play_btn.src = '/images/4.0/icons/control_pause.png';
            that.play_btn.className = 'pause_btn';
            that.play_btn.alt = 'pause slideshow';
        }
    };
    
    /**
     * if charts are playing, clear the interval to pause the playback 
     *
     * @see #playCharts
     * @see #cycleCharts
     */
    that.pauseCharts = function() {
        if(that.cycleId != null) {
            clearInterval(that.cycleId);
            that.cycleId = null;
            
            // display play button when pausing
            that.play_btn.src = '/images/4.0/icons/control_play.png';
            that.play_btn.className = 'play_btn';
            that.play_btn.alt = 'play slideshow';
        }
    };

    /**
     * fetch the chart data from server for a given chart
     */
    that.fetchAndPlayCharts = function()
    {
        console.log('fetching charts');
        
        dojo11.xhrGet( {
            url: "/api.shtml?v=1.0&s_id=chart",
            handleAs: 'json',
            load: function(data){
                that.charts = data;
                that.populateChartSelect();
                that.playCharts();
            },
            error: function(data){
                console.debug("An error occurred fetching charts: ", data);
            },
            timeout: 2000
        });
    };

    that.fetchChartData = function(chart)
    {
        console.log('fetching from url ' + "/api.shtml?v=1.0&s_id=chart&rid=" + that.charts[chart].rid + "&mtid=[" + that.charts[chart].mtid + "]");
        return dojo11.xhrGet( {
            url: "/api.shtml?v=1.0&s_id=chart&rid=" + that.charts[chart].rid + "&mtid=[" + that.charts[chart].mtid + "]",
            handleAs: 'json',
            load: function(data){
                // that.charts[chart].data = data;
                if(!data.error && data.length > 0)
                {
                    console.log('data fetched ('+data.length+' elements found)');
                    that.charts[chart].data = data[0].data;
                }
                else
                {
                    console.log('dataset empty');
                }
            },
            error: function(data){
                console.debug("An error occurred fetching charts config ", data);
            },
            timeout: 2000
        });
    };

    /**
     * fetch the stored config for the chart dashboard widget
     */
    that.fetchConfig = function()
    {
        // preset defaults
        that.config.interval = 60;
        that.config.range = '1h';
        that.config.rotation = 'true';

        dojo11.xhrGet( {
            url: "/api.shtml?v=1.0&s_id=chart&config=true",
            handleAs: 'json',
            load: function(data){
                that.config.interval = parseInt(data.ivl,10) || that.config.interval;
                that.config.range = data.tr || that.config.range;
                that.config.rotation = data.rot || that.config.rotation;
            },
            error: function(data){
                console.debug("An error occurred fetching charts config ", data);
            },
            timeout: 2000
        });
    };

    /**
     * populate the available and selected alert selectboxes
     * 
     * @see hyperic.dashboard.widget#addOptionToSelect
     */
    that.populateChartSelect = function()
    {
        for(var i = 0; i < that.charts.length; i++)
        {
            that.addOptionToSelect(that.chartselect, new Option(that.charts[i].name,i));
        }
    };
    
    /**
     * destroy the old chart, resize the chart container, and re-create the chart
     * invoked on window resize to ensure that chart always fits the widget.
     */
    that.chartResize = function()
    {
        if(that.showing == 'content')
        {
            that.chart.cleanup();
            dojo11.query('#chart_container',that.contentSheet)[0].style.width = that.contentSheet.offsetWidth - 130;
            that.chart = new hyperic.widget.Chart('chart_container', that.charts[that.currentChartId]);
            that.needsResize = false;
        }
        else
        {
            that.needsResize = true;
        }
    };

    if(that.chartsearch && that.chartselect)
    {
        // connect the onclick event of the whole widget to the clickHandler
        // function of this object, inherited from hyperic.dashboard.widget.
        dojo11.connect(node,'onclick',dojo11.hitch(that,'clickHandler'));

        // set up the event handlers for the live search box
        dojo11.connect(that.chartsearch,'onfocus', that.emptySearch);
        dojo11.connect(that.chartsearch,'onblur', that.resetSearch);
        dojo11.connect(that.chartsearch,'onkeyup',that.search);

        // set up the event handler for the select box
        dojo11.connect(that.chartselect,'onclick',that.select);
        
        // handle resizing of the window
        dojo11.connect(window,'onresize',dojo11.hitch(that, that.chartResize));

        dojo11.query('#chart_container',that.contentSheet)[0].style.width = that.contentSheet.offsetWidth - 130;
        // dojo11.query('#widget_chart',that.contentSheet)[0].style.width = that.contentSheet.offsetWidth - 130;

        that.fetchConfig();
        that.fetchAndPlayCharts();

        // while(true)
        // {
        //     if(undefined !typeof this.charts[0].data)
        //     {
        //         this.playCharts();
        //         break;
        //     }
        // }

        if(that.config.rotation == 'false')
        {
            this.pauseCharts();
        }
    }
};

// set the hyperic.dashboard.widget as the ancestor of the chartWidget class.
hyperic.dashboard.chartWidget.prototype = hyperic.dashboard.widget;

hyperic.dashboard.summaryWidget = function(node, portletName, portletLabel) {
    var that = this;

    that.configSheet = dojo11.query('.config',node)[0];
    that.contentSheet = dojo11.query('.content',node)[0];
    
    that.selected_alert_groups = [];

    that.available_alert_groups = dojo11.byId('available_alert_groups');
    that.enabled_alert_groups = dojo11.byId('enabled_alert_groups');
    that.groupsearch = dojo11.byId('groupsearch');

    that.tables = {
        lcol: dojo11.query('.lcol table tbody',node)[0],
        rcol: dojo11.query('.rcol table tbody',node)[0]
    };

    that.config = {
        portletName: portletName,
        portletLabel: portletLabel
    };

    /**
     * an event handler to handle onKeyUp events on the search textbox.
     * filters the available and enabled alert selectboxes of the widget
     * to show only the alert groups with names that match the given text 
     * 
     * @param {Event} e
     */
    that.search = function(e)
    {
        that.searchSelectBox(that.available_alert_groups, e.target.value);
        that.searchSelectBox(that.enabled_alert_groups, e.target.value);
    };
    
    /**
     * an event handler to handle the onfocus event on the search textbox.
     * It empties it to prepare it for user's input.
     * 
     * @param {Event} e
     */
    that.emptySearch = function(e)
    {
        if(e.target.value == '[ Group Search ]')
        {
            e.target.value = '';
        }
    };
    
    /**
     * an event handler to handle the onblur event on the search textbox.
     * It resets the search textbox to instruction value if it's empty.
     * 
     * @param {Event} e
     */
    that.resetSearch = function(e) 
    {
        if(e.target.value == '')
        {
            e.target.value = '[ Group Search ]';
        }
    };

    /**
     * an event handler to handle the onclick event on the enable alert button.
     * moves the selected alert from the available alerts selectbox to the 
     * enabled alerts selectbox.
     * 
     * @param {Event} e
     * @see #moveAlert
     * @see #disableAlert
     */
    that.click_enable_alert_btn = function(e)
    {
        // if(that.available_alert_groups.selectedIndex != -1)
        // {
        //     that.selected_alert_groups.push(that.available_alert_groups.options[that.available_alert_groups.selectedIndex].value);
        // }
        that.moveAlert(that.available_alert_groups,that.enabled_alert_groups);
    };
    
    /**
     * an event handler to handle the onclick event on the disable alert button.
     * moves the selected alert from the enabled alerts selectbox to the 
     * available alerts selet.
     * 
     * @param {Event} e
     * @see #moveAlert
     * @see #enableAlert
     */
    that.click_disable_alert_btn = function(e)
    {
        // remove the selected index from the this.enabled_alert_groups array
        // if(that.enabled_alert_groups.selectedIndex != -1)
        // {
        //     that.selected_alert_groups.splice(
        //         that.selected_alert_groups.indexOf(
        //             that.enabled_alert_groups.options[
        //                 that.enabled_alert_groups.selectedIndex
        //                 ].value
        //         ),
        //         1
        //     );
        // }
        that.moveAlert(that.enabled_alert_groups,that.available_alert_groups);
    };

    /**
     * save button handler
     * store the data on server, then rebuild the selected_alert_groups local array
     * fetch the updated alert group status,
     * repaint the tables and
     * swap the config layer and show content layer again
     */
    that.click_save_btn = function(e)
    {
        // dojo11.xhrGet( {
        //         url: "save.php",
        //         load: function(data){
        //             this.swapSheets(this.configSheet,this.contentSheet);
        //         },
        //         error: function(data){
        //             this.swapSheets(this.configSheet,this.contentSheet);
        //             console.debug("An error occurred: ", data);
        //             // dojo11.query('.save_btn', config_form)[0].disabled = true;
        //         },
        //         timeout: 2000,
        //         form: dojo11.query('form', this.configSheet)[0]
        // });

        that.selected_alert_groups = [];
        for(var i = 0, j = that.enabled_alert_groups.options.length; i < j; i++)
        {
            if(that.enabled_alert_groups.options[i])
            {
                // console.log(that.enabled_alert_groups.options[i]);
                that.selected_alert_groups.push(that.enabled_alert_groups.options[i].value);
            }
        }

        that.fetchAlertGroupStatus();
        that.repaintAlertGroups();
        that.swapSheets(this.configSheet,this.contentSheet);
    };

    /**
     * an event handler to handle the onclick event on the disable alert button.
     * moves the selected alert from the enabled alerts selectbox to the 
     * available alerts selet.
     * 
     * @param {Node} from: selectbox node to move option from 
     * @param {Node} to: selectbox node to move option to 
     * @see #enableAlert
     * @see #disableAlert
     * @see hyperic.dashboard.widget#addOptionToSelect
     */
    that.moveAlert = function(from,to)
    {
        if(from.selectedIndex != -1)
        {
            that.addOptionToSelect(to, from.options[from.selectedIndex]);
            from.remove(from.selectedIndex);
        }
    };

    /**
     * populate the available and selected alert selectboxes
     * 
     * @param {Object} hash of available alerts, in form { id: name, ... } 
     * @param {Array} array of the id's of the enabled alerts, in form [ id, ... ]
     * @see hyperic.dashboard.widget#addOptionToSelect
     */
    that.populateAlertGroups = function(alerts, selected_alert_groups)
    {
        for(var i in alerts)
        {
            var to = null;
            var alertOption = new Option(alerts[i],i);
            for(var j = 0; j < selected_alert_groups.length; j++)
            {
                if(selected_alert_groups[j] == i-1)
                {
                    to = that.enabled_alert_groups;
                    break;
                }
            }
            to = to || that.available_alert_groups;
            
            that.addOptionToSelect(to,alertOption);
        }
    };

    /**
     * utility function to sort alert data by alert group name
     */
    that.by_name = function(a,b)
    {
        return that.alert_groups.data[a] > that.alert_groups.data[b];
    };

    /**
     * destroy current alert tables, and call #paintAlertGroups() to re-paint them
     */
    that.repaintAlertGroups = function() 
    {
        for(var i in that.tables)
        {
            while(that.tables[i].lastChild) {
              that.tables[i].removeChild(that.tables[i].lastChild);
            }
        }
        that.paintAlertGroups();
    };

    /**
     * populate the html tables with the alerts based on the data in the #alert_group_status array
     */
    that.paintAlertGroups = function()
    {
        var groups = that.selected_alert_groups.sort(that.by_name);
        var half = Math.ceil(groups.length/2);
        
        var status = {
            'r' : 'Failure',
            'g' : 'OK',
            'y' : 'Warning',
            'd' : 'No Data'
        };

        for(var i = 0; i < groups.length; i++)
        {
            var table = (i < half) ? that.tables.lcol : that.tables.rcol;
            var row = table.insertRow(-1);
            
            row.className = ((i < half ? i : i - half) % 2 == 0) ? 'even' : 'odd';

            row.id = 'alertGroup:' + groups[i];
            var data = that.alert_group_status[groups[i]] || ['d','d'];
            var name = that.alert_groups.data[groups[i]];
            row.innerHTML = '<th scope="row">'+ name +'</th><td><img src="/images/'+data[0]+'.png" alt="'+ status[data[0]] +'"></td><td><img src="/images/'+data[1]+'.png"alt="'+ status[data[1]]+'"></td>';
            data = name = null;
        }
    };

    /**
     * fetch all available alert groups from server
     * the server should return a json object of the following form:
     * { 
     *     data: { 
     *         "id" : "name",
     *         ...
     *     },
     *     count: 10
     * }
     * the count element shall be the total number of alert groups available
     * (may be greater than number returned)
     *
     * @param {Number} page number
     * @param {String} string to search alerts for
     */
    that.fetchAlertGroups = function(page, searchString)
    {
        // offset = offset || 0;
        that.alert_groups = { 
                data: { 
                    1 : "Apache VHosts",
                    2 : "HTTP Serivces",
                    3 : "Linux Boxes",
                    4 : "REST API",
                    5 : "SF Data Center",
                    6 : "Storage 1",
                    7 : "WS API",
                    8 : "Applications",
                    9 : "CentOS Boxes",
                    10 : "SuSE Boxes"
                },
                count: 10
            };
    };

    /**
     * fetch the alert group status from server for currently selected alert groups
     * the server should return a json object of the following form:
     * { 
     *    "id" : ['resouce alert status','group alert status'],
     *    ...
     * }
     * the status is a letter code ('r' for red,'g' for green,'y' for yellow, or 'd' for data unavailable);
     */
    that.fetchAlertGroupStatus = function()
    {
        that.alert_group_status = {
            '1': ['r','g'],
            '2': ['g','y'],
            '3': ['g','g'],
            '4': ['g','r'],
            '5': ['g','y'],
            // '6': ['g','g'],
            '7': ['g','g'],
            '8': ['g','g'],
            '9': ['g','g'],
            '10': ['g','g']
        };
    };

    /**
     * fetch the stored selected alert groups for the dashboard widget
     * the server should return a json array of the alert group id's
     * [ 
     *    "id",
     *    ...
     * ]
     */
    that.fetchConfig = function()
    {
        that.selected_alert_groups = ['1','2','3','4','5','6','7'];
    };

    if(that.available_alert_groups && that.enabled_alert_groups)
    {
        // connect the onclick event of the whole widget to the clickHandler
        // function of this object, inherited from hyperic.dashboard.widget.
        dojo11.connect(node,'onclick',dojo11.hitch(that,'clickHandler'));

        // set up the event handlers for the live search box
        dojo11.connect(that.groupsearch,'onfocus', that.emptySearch);
        dojo11.connect(that.groupsearch,'onblur', that.resetSearch);
        dojo11.connect(that.groupsearch,'onkeyup',that.search);
        
        that.fetchConfig();
        that.fetchAlertGroups();
        that.fetchAlertGroupStatus();
        that.populateAlertGroups(that.alert_groups.data, that.selected_alert_groups);
        that.paintAlertGroups();
    }
};

// set the hyperic.dashboard.widget as the ancestor of the chartWidget class.
hyperic.dashboard.summaryWidget.prototype = hyperic.dashboard.widget;


/* timeplot charts.dev.js */
//INIT
var SimileAjax = {
	loaded:                 true,
	loadingScriptsCount:    0,
	error:                  null,
	params:                 { bundle:"true" }
};
SimileAjax.Platform = new Object();
SimileAjax.urlPrefix ='/';
//SIMILE AJAX - LOAD ORDER 1 of 3


/* jquery-1.2.3.js */
(function(){if(window.jQuery){var _jQuery=window.jQuery;
}var jQuery=window.jQuery=function(selector,context){return new jQuery.prototype.init(selector,context);
};
if(window.$){var _$=window.$;
}window.$=jQuery;
var quickExpr=/^[^<]*(<(.|\s)+>)[^>]*$|^#(\w+)$/;
var isSimple=/^.[^:#\[\.]*$/;
jQuery.fn=jQuery.prototype={init:function(selector,context){selector=selector||document;
if(selector.nodeType){this[0]=selector;
this.length=1;
return this;
}else{if(typeof selector=="string"){var match=quickExpr.exec(selector);
if(match&&(match[1]||!context)){if(match[1]){selector=jQuery.clean([match[1]],context);
}else{var elem=document.getElementById(match[3]);
if(elem){if(elem.id!=match[3]){return jQuery().find(selector);
}else{this[0]=elem;
this.length=1;
return this;
}}else{selector=[];
}}}else{return new jQuery(context).find(selector);
}}else{if(jQuery.isFunction(selector)){return new jQuery(document)[jQuery.fn.ready?"ready":"load"](selector);
}}}return this.setArray(selector.constructor==Array&&selector||(selector.jquery||selector.length&&selector!=window&&!selector.nodeType&&selector[0]!=undefined&&selector[0].nodeType)&&jQuery.makeArray(selector)||[selector]);
},jquery:"1.2.3",size:function(){return this.length;
},length:0,get:function(num){return num==undefined?jQuery.makeArray(this):this[num];
},pushStack:function(elems){var ret=jQuery(elems);
ret.prevObject=this;
return ret;
},setArray:function(elems){this.length=0;
Array.prototype.push.apply(this,elems);
return this;
},each:function(callback,args){return jQuery.each(this,callback,args);
},index:function(elem){var ret=-1;
this.each(function(i){if(this==elem){ret=i;
}});
return ret;
},attr:function(name,value,type){var options=name;
if(name.constructor==String){if(value==undefined){return this.length&&jQuery[type||"attr"](this[0],name)||undefined;
}else{options={};
options[name]=value;
}}return this.each(function(i){for(name in options){jQuery.attr(type?this.style:this,name,jQuery.prop(this,options[name],type,i,name));
}});
},css:function(key,value){if((key=="width"||key=="height")&&parseFloat(value)<0){value=undefined;
}return this.attr(key,value,"curCSS");
},text:function(text){if(typeof text!="object"&&text!=null){return this.empty().append((this[0]&&this[0].ownerDocument||document).createTextNode(text));
}var ret="";
jQuery.each(text||this,function(){jQuery.each(this.childNodes,function(){if(this.nodeType!=8){ret+=this.nodeType!=1?this.nodeValue:jQuery.fn.text([this]);
}});
});
return ret;
},wrapAll:function(html){if(this[0]){jQuery(html,this[0].ownerDocument).clone().insertBefore(this[0]).map(function(){var elem=this;
while(elem.firstChild){elem=elem.firstChild;
}return elem;
}).append(this);
}return this;
},wrapInner:function(html){return this.each(function(){jQuery(this).contents().wrapAll(html);
});
},wrap:function(html){return this.each(function(){jQuery(this).wrapAll(html);
});
},append:function(){return this.domManip(arguments,true,false,function(elem){if(this.nodeType==1){this.appendChild(elem);
}});
},prepend:function(){return this.domManip(arguments,true,true,function(elem){if(this.nodeType==1){this.insertBefore(elem,this.firstChild);
}});
},before:function(){return this.domManip(arguments,false,false,function(elem){this.parentNode.insertBefore(elem,this);
});
},after:function(){return this.domManip(arguments,false,true,function(elem){this.parentNode.insertBefore(elem,this.nextSibling);
});
},end:function(){return this.prevObject||jQuery([]);
},find:function(selector){var elems=jQuery.map(this,function(elem){return jQuery.find(selector,elem);
});
return this.pushStack(/[^+>] [^+>]/.test(selector)||selector.indexOf("..")>-1?jQuery.unique(elems):elems);
},clone:function(events){var ret=this.map(function(){if(jQuery.browser.msie&&!jQuery.isXMLDoc(this)){var clone=this.cloneNode(true),container=document.createElement("div");
container.appendChild(clone);
return jQuery.clean([container.innerHTML])[0];
}else{return this.cloneNode(true);
}});
var clone=ret.find("*").andSelf().each(function(){if(this[expando]!=undefined){this[expando]=null;
}});
if(events===true){this.find("*").andSelf().each(function(i){if(this.nodeType==3){return ;
}var events=jQuery.data(this,"events");
for(var type in events){for(var handler in events[type]){jQuery.event.add(clone[i],type,events[type][handler],events[type][handler].data);
}}});
}return ret;
},filter:function(selector){return this.pushStack(jQuery.isFunction(selector)&&jQuery.grep(this,function(elem,i){return selector.call(elem,i);
})||jQuery.multiFilter(selector,this));
},not:function(selector){if(selector.constructor==String){if(isSimple.test(selector)){return this.pushStack(jQuery.multiFilter(selector,this,true));
}else{selector=jQuery.multiFilter(selector,this);
}}var isArrayLike=selector.length&&selector[selector.length-1]!==undefined&&!selector.nodeType;
return this.filter(function(){return isArrayLike?jQuery.inArray(this,selector)<0:this!=selector;
});
},add:function(selector){return !selector?this:this.pushStack(jQuery.merge(this.get(),selector.constructor==String?jQuery(selector).get():selector.length!=undefined&&(!selector.nodeName||jQuery.nodeName(selector,"form"))?selector:[selector]));
},is:function(selector){return selector?jQuery.multiFilter(selector,this).length>0:false;
},hasClass:function(selector){return this.is("."+selector);
},val:function(value){if(value==undefined){if(this.length){var elem=this[0];
if(jQuery.nodeName(elem,"select")){var index=elem.selectedIndex,values=[],options=elem.options,one=elem.type=="select-one";
if(index<0){return null;
}for(var i=one?index:0,max=one?index+1:options.length;
i<max;
i++){var option=options[i];
if(option.selected){value=jQuery.browser.msie&&!option.attributes.value.specified?option.text:option.value;
if(one){return value;
}values.push(value);
}}return values;
}else{return(this[0].value||"").replace(/\r/g,"");
}}return undefined;
}return this.each(function(){if(this.nodeType!=1){return ;
}if(value.constructor==Array&&/radio|checkbox/.test(this.type)){this.checked=(jQuery.inArray(this.value,value)>=0||jQuery.inArray(this.name,value)>=0);
}else{if(jQuery.nodeName(this,"select")){var values=value.constructor==Array?value:[value];
jQuery("option",this).each(function(){this.selected=(jQuery.inArray(this.value,values)>=0||jQuery.inArray(this.text,values)>=0);
});
if(!values.length){this.selectedIndex=-1;
}}else{this.value=value;
}}});
},html:function(value){return value==undefined?(this.length?this[0].innerHTML:null):this.empty().append(value);
},replaceWith:function(value){return this.after(value).remove();
},eq:function(i){return this.slice(i,i+1);
},slice:function(){return this.pushStack(Array.prototype.slice.apply(this,arguments));
},map:function(callback){return this.pushStack(jQuery.map(this,function(elem,i){return callback.call(elem,i,elem);
}));
},andSelf:function(){return this.add(this.prevObject);
},data:function(key,value){var parts=key.split(".");
parts[1]=parts[1]?"."+parts[1]:"";
if(value==null){var data=this.triggerHandler("getData"+parts[1]+"!",[parts[0]]);
if(data==undefined&&this.length){data=jQuery.data(this[0],key);
}return data==null&&parts[1]?this.data(parts[0]):data;
}else{return this.trigger("setData"+parts[1]+"!",[parts[0],value]).each(function(){jQuery.data(this,key,value);
});
}},removeData:function(key){return this.each(function(){jQuery.removeData(this,key);
});
},domManip:function(args,table,reverse,callback){var clone=this.length>1,elems;
return this.each(function(){if(!elems){elems=jQuery.clean(args,this.ownerDocument);
if(reverse){elems.reverse();
}}var obj=this;
if(table&&jQuery.nodeName(this,"table")&&jQuery.nodeName(elems[0],"tr")){obj=this.getElementsByTagName("tbody")[0]||this.appendChild(this.ownerDocument.createElement("tbody"));
}var scripts=jQuery([]);
jQuery.each(elems,function(){var elem=clone?jQuery(this).clone(true)[0]:this;
if(jQuery.nodeName(elem,"script")){scripts=scripts.add(elem);
}else{if(elem.nodeType==1){scripts=scripts.add(jQuery("script",elem).remove());
}callback.call(obj,elem);
}});
scripts.each(evalScript);
});
}};
jQuery.prototype.init.prototype=jQuery.prototype;
function evalScript(i,elem){if(elem.src){jQuery.ajax({url:elem.src,async:false,dataType:"script"});
}else{jQuery.globalEval(elem.text||elem.textContent||elem.innerHTML||"");
}if(elem.parentNode){elem.parentNode.removeChild(elem);
}}jQuery.extend=jQuery.fn.extend=function(){var target=arguments[0]||{},i=1,length=arguments.length,deep=false,options;
if(target.constructor==Boolean){deep=target;
target=arguments[1]||{};
i=2;
}if(typeof target!="object"&&typeof target!="function"){target={};
}if(length==1){target=this;
i=0;
}for(;
i<length;
i++){if((options=arguments[i])!=null){for(var name in options){if(target===options[name]){continue;
}if(deep&&options[name]&&typeof options[name]=="object"&&target[name]&&!options[name].nodeType){target[name]=jQuery.extend(target[name],options[name]);
}else{if(options[name]!=undefined){target[name]=options[name];
}}}}}return target;
};
var expando="jQuery"+(new Date()).getTime(),uuid=0,windowData={};
var exclude=/z-?index|font-?weight|opacity|zoom|line-?height/i;
jQuery.extend({noConflict:function(deep){window.$=_$;
if(deep){window.jQuery=_jQuery;
}return jQuery;
},isFunction:function(fn){return !!fn&&typeof fn!="string"&&!fn.nodeName&&fn.constructor!=Array&&/function/i.test(fn+"");
},isXMLDoc:function(elem){return elem.documentElement&&!elem.body||elem.tagName&&elem.ownerDocument&&!elem.ownerDocument.body;
},globalEval:function(data){data=jQuery.trim(data);
if(data){var head=document.getElementsByTagName("head")[0]||document.documentElement,script=document.createElement("script");
script.type="text/javascript";
if(jQuery.browser.msie){script.text=data;
}else{script.appendChild(document.createTextNode(data));
}head.appendChild(script);
head.removeChild(script);
}},nodeName:function(elem,name){return elem.nodeName&&elem.nodeName.toUpperCase()==name.toUpperCase();
},cache:{},data:function(elem,name,data){elem=elem==window?windowData:elem;
var id=elem[expando];
if(!id){id=elem[expando]=++uuid;
}if(name&&!jQuery.cache[id]){jQuery.cache[id]={};
}if(data!=undefined){jQuery.cache[id][name]=data;
}return name?jQuery.cache[id][name]:id;
},removeData:function(elem,name){elem=elem==window?windowData:elem;
var id=elem[expando];
if(name){if(jQuery.cache[id]){delete jQuery.cache[id][name];
name="";
for(name in jQuery.cache[id]){break;
}if(!name){jQuery.removeData(elem);
}}}else{try{delete elem[expando];
}catch(e){if(elem.removeAttribute){elem.removeAttribute(expando);
}}delete jQuery.cache[id];
}},each:function(object,callback,args){if(args){if(object.length==undefined){for(var name in object){if(callback.apply(object[name],args)===false){break;
}}}else{for(var i=0,length=object.length;
i<length;
i++){if(callback.apply(object[i],args)===false){break;
}}}}else{if(object.length==undefined){for(var name in object){if(callback.call(object[name],name,object[name])===false){break;
}}}else{for(var i=0,length=object.length,value=object[0];
i<length&&callback.call(value,i,value)!==false;
value=object[++i]){}}}return object;
},prop:function(elem,value,type,i,name){if(jQuery.isFunction(value)){value=value.call(elem,i);
}return value&&value.constructor==Number&&type=="curCSS"&&!exclude.test(name)?value+"px":value;
},className:{add:function(elem,classNames){jQuery.each((classNames||"").split(/\s+/),function(i,className){if(elem.nodeType==1&&!jQuery.className.has(elem.className,className)){elem.className+=(elem.className?" ":"")+className;
}});
},remove:function(elem,classNames){if(elem.nodeType==1){elem.className=classNames!=undefined?jQuery.grep(elem.className.split(/\s+/),function(className){return !jQuery.className.has(classNames,className);
}).join(" "):"";
}},has:function(elem,className){return jQuery.inArray(className,(elem.className||elem).toString().split(/\s+/))>-1;
}},swap:function(elem,options,callback){var old={};
for(var name in options){old[name]=elem.style[name];
elem.style[name]=options[name];
}callback.call(elem);
for(var name in options){elem.style[name]=old[name];
}},css:function(elem,name,force){if(name=="width"||name=="height"){var val,props={position:"absolute",visibility:"hidden",display:"block"},which=name=="width"?["Left","Right"]:["Top","Bottom"];
function getWH(){val=name=="width"?elem.offsetWidth:elem.offsetHeight;
var padding=0,border=0;
jQuery.each(which,function(){padding+=parseFloat(jQuery.curCSS(elem,"padding"+this,true))||0;
border+=parseFloat(jQuery.curCSS(elem,"border"+this+"Width",true))||0;
});
val-=Math.round(padding+border);
}if(jQuery(elem).is(":visible")){getWH();
}else{jQuery.swap(elem,props,getWH);
}return Math.max(0,val);
}return jQuery.curCSS(elem,name,force);
},curCSS:function(elem,name,force){var ret;
function color(elem){if(!jQuery.browser.safari){return false;
}var ret=document.defaultView.getComputedStyle(elem,null);
return !ret||ret.getPropertyValue("color")=="";
}if(name=="opacity"&&jQuery.browser.msie){ret=jQuery.attr(elem.style,"opacity");
return ret==""?"1":ret;
}if(jQuery.browser.opera&&name=="display"){var save=elem.style.outline;
elem.style.outline="0 solid black";
elem.style.outline=save;
}if(name.match(/float/i)){name=styleFloat;
}if(!force&&elem.style&&elem.style[name]){ret=elem.style[name];
}else{if(document.defaultView&&document.defaultView.getComputedStyle){if(name.match(/float/i)){name="float";
}name=name.replace(/([A-Z])/g,"-$1").toLowerCase();
var getComputedStyle=document.defaultView.getComputedStyle(elem,null);
if(getComputedStyle&&!color(elem)){ret=getComputedStyle.getPropertyValue(name);
}else{var swap=[],stack=[];
for(var a=elem;
a&&color(a);
a=a.parentNode){stack.unshift(a);
}for(var i=0;
i<stack.length;
i++){if(color(stack[i])){swap[i]=stack[i].style.display;
stack[i].style.display="block";
}}ret=name=="display"&&swap[stack.length-1]!=null?"none":(getComputedStyle&&getComputedStyle.getPropertyValue(name))||"";
for(var i=0;
i<swap.length;
i++){if(swap[i]!=null){stack[i].style.display=swap[i];
}}}if(name=="opacity"&&ret==""){ret="1";
}}else{if(elem.currentStyle){var camelCase=name.replace(/\-(\w)/g,function(all,letter){return letter.toUpperCase();
});
ret=elem.currentStyle[name]||elem.currentStyle[camelCase];
if(!/^\d+(px)?$/i.test(ret)&&/^\d/.test(ret)){var style=elem.style.left,runtimeStyle=elem.runtimeStyle.left;
elem.runtimeStyle.left=elem.currentStyle.left;
elem.style.left=ret||0;
ret=elem.style.pixelLeft+"px";
elem.style.left=style;
elem.runtimeStyle.left=runtimeStyle;
}}}}return ret;
},clean:function(elems,context){var ret=[];
context=context||document;
if(typeof context.createElement=="undefined"){context=context.ownerDocument||context[0]&&context[0].ownerDocument||document;
}jQuery.each(elems,function(i,elem){if(!elem){return ;
}if(elem.constructor==Number){elem=elem.toString();
}if(typeof elem=="string"){elem=elem.replace(/(<(\w+)[^>]*?)\/>/g,function(all,front,tag){return tag.match(/^(abbr|br|col|img|input|link|meta|param|hr|area|embed)$/i)?all:front+"></"+tag+">";
});
var tags=jQuery.trim(elem).toLowerCase(),div=context.createElement("div");
var wrap=!tags.indexOf("<opt")&&[1,"<select multiple='multiple'>","</select>"]||!tags.indexOf("<leg")&&[1,"<fieldset>","</fieldset>"]||tags.match(/^<(thead|tbody|tfoot|colg|cap)/)&&[1,"<table>","</table>"]||!tags.indexOf("<tr")&&[2,"<table><tbody>","</tbody></table>"]||(!tags.indexOf("<td")||!tags.indexOf("<th"))&&[3,"<table><tbody><tr>","</tr></tbody></table>"]||!tags.indexOf("<col")&&[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"]||jQuery.browser.msie&&[1,"div<div>","</div>"]||[0,"",""];
div.innerHTML=wrap[1]+elem+wrap[2];
while(wrap[0]--){div=div.lastChild;
}if(jQuery.browser.msie){var tbody=!tags.indexOf("<table")&&tags.indexOf("<tbody")<0?div.firstChild&&div.firstChild.childNodes:wrap[1]=="<table>"&&tags.indexOf("<tbody")<0?div.childNodes:[];
for(var j=tbody.length-1;
j>=0;
--j){if(jQuery.nodeName(tbody[j],"tbody")&&!tbody[j].childNodes.length){tbody[j].parentNode.removeChild(tbody[j]);
}}if(/^\s/.test(elem)){div.insertBefore(context.createTextNode(elem.match(/^\s*/)[0]),div.firstChild);
}}elem=jQuery.makeArray(div.childNodes);
}if(elem.length===0&&(!jQuery.nodeName(elem,"form")&&!jQuery.nodeName(elem,"select"))){return ;
}if(elem[0]==undefined||jQuery.nodeName(elem,"form")||elem.options){ret.push(elem);
}else{ret=jQuery.merge(ret,elem);
}});
return ret;
},attr:function(elem,name,value){if(!elem||elem.nodeType==3||elem.nodeType==8){return undefined;
}var fix=jQuery.isXMLDoc(elem)?{}:jQuery.props;
if(name=="selected"&&jQuery.browser.safari){elem.parentNode.selectedIndex;
}if(fix[name]){if(value!=undefined){elem[fix[name]]=value;
}return elem[fix[name]];
}else{if(jQuery.browser.msie&&name=="style"){return jQuery.attr(elem.style,"cssText",value);
}else{if(value==undefined&&jQuery.browser.msie&&jQuery.nodeName(elem,"form")&&(name=="action"||name=="method")){return elem.getAttributeNode(name).nodeValue;
}else{if(elem.tagName){if(value!=undefined){if(name=="type"&&jQuery.nodeName(elem,"input")&&elem.parentNode){throw"type property can't be changed";
}elem.setAttribute(name,""+value);
}if(jQuery.browser.msie&&/href|src/.test(name)&&!jQuery.isXMLDoc(elem)){return elem.getAttribute(name,2);
}return elem.getAttribute(name);
}else{if(name=="opacity"&&jQuery.browser.msie){if(value!=undefined){elem.zoom=1;
elem.filter=(elem.filter||"").replace(/alpha\([^)]*\)/,"")+(parseFloat(value).toString()=="NaN"?"":"alpha(opacity="+value*100+")");
}return elem.filter&&elem.filter.indexOf("opacity=")>=0?(parseFloat(elem.filter.match(/opacity=([^)]*)/)[1])/100).toString():"";
}name=name.replace(/-([a-z])/ig,function(all,letter){return letter.toUpperCase();
});
if(value!=undefined){elem[name]=value;
}return elem[name];
}}}}},trim:function(text){return(text||"").replace(/^\s+|\s+$/g,"");
},makeArray:function(array){var ret=[];
if(typeof array!="array"){for(var i=0,length=array.length;
i<length;
i++){ret.push(array[i]);
}}else{ret=array.slice(0);
}return ret;
},inArray:function(elem,array){for(var i=0,length=array.length;
i<length;
i++){if(array[i]==elem){return i;
}}return -1;
},merge:function(first,second){if(jQuery.browser.msie){for(var i=0;
second[i];
i++){if(second[i].nodeType!=8){first.push(second[i]);
}}}else{for(var i=0;
second[i];
i++){first.push(second[i]);
}}return first;
},unique:function(array){var ret=[],done={};
try{for(var i=0,length=array.length;
i<length;
i++){var id=jQuery.data(array[i]);
if(!done[id]){done[id]=true;
ret.push(array[i]);
}}}catch(e){ret=array;
}return ret;
},grep:function(elems,callback,inv){var ret=[];
for(var i=0,length=elems.length;
i<length;
i++){if(!inv&&callback(elems[i],i)||inv&&!callback(elems[i],i)){ret.push(elems[i]);
}}return ret;
},map:function(elems,callback){var ret=[];
for(var i=0,length=elems.length;
i<length;
i++){var value=callback(elems[i],i);
if(value!==null&&value!=undefined){if(value.constructor!=Array){value=[value];
}ret=ret.concat(value);
}}return ret;
}});
var userAgent=navigator.userAgent.toLowerCase();
jQuery.browser={version:(userAgent.match(/.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/)||[])[1],safari:/webkit/.test(userAgent),opera:/opera/.test(userAgent),msie:/msie/.test(userAgent)&&!/opera/.test(userAgent),mozilla:/mozilla/.test(userAgent)&&!/(compatible|webkit)/.test(userAgent)};
var styleFloat=jQuery.browser.msie?"styleFloat":"cssFloat";
jQuery.extend({boxModel:!jQuery.browser.msie||document.compatMode=="CSS1Compat",props:{"for":"htmlFor","class":"className","float":styleFloat,cssFloat:styleFloat,styleFloat:styleFloat,innerHTML:"innerHTML",className:"className",value:"value",disabled:"disabled",checked:"checked",readonly:"readOnly",selected:"selected",maxlength:"maxLength",selectedIndex:"selectedIndex",defaultValue:"defaultValue",tagName:"tagName",nodeName:"nodeName"}});
jQuery.each({parent:function(elem){return elem.parentNode;
},parents:function(elem){return jQuery.dir(elem,"parentNode");
},next:function(elem){return jQuery.nth(elem,2,"nextSibling");
},prev:function(elem){return jQuery.nth(elem,2,"previousSibling");
},nextAll:function(elem){return jQuery.dir(elem,"nextSibling");
},prevAll:function(elem){return jQuery.dir(elem,"previousSibling");
},siblings:function(elem){return jQuery.sibling(elem.parentNode.firstChild,elem);
},children:function(elem){return jQuery.sibling(elem.firstChild);
},contents:function(elem){return jQuery.nodeName(elem,"iframe")?elem.contentDocument||elem.contentWindow.document:jQuery.makeArray(elem.childNodes);
}},function(name,fn){jQuery.fn[name]=function(selector){var ret=jQuery.map(this,fn);
if(selector&&typeof selector=="string"){ret=jQuery.multiFilter(selector,ret);
}return this.pushStack(jQuery.unique(ret));
};
});
jQuery.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(name,original){jQuery.fn[name]=function(){var args=arguments;
return this.each(function(){for(var i=0,length=args.length;
i<length;
i++){jQuery(args[i])[original](this);
}});
};
});
jQuery.each({removeAttr:function(name){jQuery.attr(this,name,"");
if(this.nodeType==1){this.removeAttribute(name);
}},addClass:function(classNames){jQuery.className.add(this,classNames);
},removeClass:function(classNames){jQuery.className.remove(this,classNames);
},toggleClass:function(classNames){jQuery.className[jQuery.className.has(this,classNames)?"remove":"add"](this,classNames);
},remove:function(selector){if(!selector||jQuery.filter(selector,[this]).r.length){jQuery("*",this).add(this).each(function(){jQuery.event.remove(this);
jQuery.removeData(this);
});
if(this.parentNode){this.parentNode.removeChild(this);
}}},empty:function(){jQuery(">*",this).remove();
while(this.firstChild){this.removeChild(this.firstChild);
}}},function(name,fn){jQuery.fn[name]=function(){return this.each(fn,arguments);
};
});
jQuery.each(["Height","Width"],function(i,name){var type=name.toLowerCase();
jQuery.fn[type]=function(size){return this[0]==window?jQuery.browser.opera&&document.body["client"+name]||jQuery.browser.safari&&window["inner"+name]||document.compatMode=="CSS1Compat"&&document.documentElement["client"+name]||document.body["client"+name]:this[0]==document?Math.max(Math.max(document.body["scroll"+name],document.documentElement["scroll"+name]),Math.max(document.body["offset"+name],document.documentElement["offset"+name])):size==undefined?(this.length?jQuery.css(this[0],type):null):this.css(type,size.constructor==String?size:size+"px");
};
});
var chars=jQuery.browser.safari&&parseInt(jQuery.browser.version)<417?"(?:[\\w*_-]|\\\\.)":"(?:[\\w\u0128-\uFFFF*_-]|\\\\.)",quickChild=new RegExp("^>\\s*("+chars+"+)"),quickID=new RegExp("^("+chars+"+)(#)("+chars+"+)"),quickClass=new RegExp("^([#.]?)("+chars+"*)");
jQuery.extend({expr:{"":function(a,i,m){return m[2]=="*"||jQuery.nodeName(a,m[2]);
},"#":function(a,i,m){return a.getAttribute("id")==m[2];
},":":{lt:function(a,i,m){return i<m[3]-0;
},gt:function(a,i,m){return i>m[3]-0;
},nth:function(a,i,m){return m[3]-0==i;
},eq:function(a,i,m){return m[3]-0==i;
},first:function(a,i){return i==0;
},last:function(a,i,m,r){return i==r.length-1;
},even:function(a,i){return i%2==0;
},odd:function(a,i){return i%2;
},"first-child":function(a){return a.parentNode.getElementsByTagName("*")[0]==a;
},"last-child":function(a){return jQuery.nth(a.parentNode.lastChild,1,"previousSibling")==a;
},"only-child":function(a){return !jQuery.nth(a.parentNode.lastChild,2,"previousSibling");
},parent:function(a){return a.firstChild;
},empty:function(a){return !a.firstChild;
},contains:function(a,i,m){return(a.textContent||a.innerText||jQuery(a).text()||"").indexOf(m[3])>=0;
},visible:function(a){return"hidden"!=a.type&&jQuery.css(a,"display")!="none"&&jQuery.css(a,"visibility")!="hidden";
},hidden:function(a){return"hidden"==a.type||jQuery.css(a,"display")=="none"||jQuery.css(a,"visibility")=="hidden";
},enabled:function(a){return !a.disabled;
},disabled:function(a){return a.disabled;
},checked:function(a){return a.checked;
},selected:function(a){return a.selected||jQuery.attr(a,"selected");
},text:function(a){return"text"==a.type;
},radio:function(a){return"radio"==a.type;
},checkbox:function(a){return"checkbox"==a.type;
},file:function(a){return"file"==a.type;
},password:function(a){return"password"==a.type;
},submit:function(a){return"submit"==a.type;
},image:function(a){return"image"==a.type;
},reset:function(a){return"reset"==a.type;
},button:function(a){return"button"==a.type||jQuery.nodeName(a,"button");
},input:function(a){return/input|select|textarea|button/i.test(a.nodeName);
},has:function(a,i,m){return jQuery.find(m[3],a).length;
},header:function(a){return/h\d/i.test(a.nodeName);
},animated:function(a){return jQuery.grep(jQuery.timers,function(fn){return a==fn.elem;
}).length;
}}},
parse:[
/^(\[) *@?([\w-]+) *([!*$^~=]*) *('?"?)(.*?)\4 *\]/,
/^(:)([\w-]+)\("?'?(.*?(\(.*?\))?[^(]*?)"?'?\)/,
new RegExp("^([:.#]*)("+chars+"+)")],
multiFilter: function(expr,elems,not){ 
var old,cur=[];
while(expr&&expr!=old){old=expr;
var f=jQuery.filter(expr,elems,not);
expr=f.t.replace(/^\s*,\s*/,"");
cur=not?elems=f.r:jQuery.merge(cur,f.r);
}
return cur;
},
find: function(t,context){
if(typeof t!="string"){
return[t];
}
if(context&&context.nodeType!=1&&context.nodeType!=9){
return[];
}
context=context||document;
var ret=[context],done=[],last,nodeName;
while(t&&last!=t){
var r=[];
last=t;
t=jQuery.trim(t);
var foundToken=false;
var re=quickChild;
var m=re.exec(t);
if(m){
nodeName=m[1].toUpperCase();
for(var i=0; ret[i]; i++){
for(var c=ret[i].firstChild; c; c=c.nextSibling){
if( c.nodeType==1&&(nodeName=="*"||c.nodeName.toUpperCase()==nodeName)){
r.push(c);
}
}
}
ret=r;
t=t.replace(re,"");
if(t.indexOf(" ")==0){
continue;
}
foundToken=true;
}
else{
re=/^([>+~])\s*(\w*)/i;
if((m=re.exec(t))!=null){
r=[];
var merge={};
nodeName=m[2].toUpperCase();
m=m[1];
for(var j=0,rl=ret.length;j<rl;j++){
var n=m=="~"||m=="+"?ret[j].nextSibling:ret[j].firstChild;
for(;n;n=n.nextSibling){
if(n.nodeType==1){
var id=jQuery.data(n);
if(m=="~"&&merge[id]){
break;
}
if(!nodeName||n.nodeName.toUpperCase()==nodeName){
if(m=="~"){
merge[id]=true;
}
r.push(n);
}
if(m=="+"){
break;
}
}
}
}
ret=r;
t=jQuery.trim(t.replace(re,""));
foundToken=true;
}}if(t&&!foundToken){if(!t.indexOf(",")){if(context==ret[0]){ret.shift();
}done=jQuery.merge(done,ret);
r=ret=[context];
t=" "+t.substr(1,t.length);
}else{var re2=quickID;
var m=re2.exec(t);
if(m){m=[0,m[2],m[3],m[1]];
}else{re2=quickClass;
m=re2.exec(t);
}m[2]=m[2].replace(/\\/g,"");
var elem=ret[ret.length-1];
if(m[1]=="#"&&elem&&elem.getElementById&&!jQuery.isXMLDoc(elem)){var oid=elem.getElementById(m[2]);
if((jQuery.browser.msie||jQuery.browser.opera)&&oid&&typeof oid.id=="string"&&oid.id!=m[2]){oid=jQuery('[@id="'+m[2]+'"]',elem)[0];
}ret=r=oid&&(!m[3]||jQuery.nodeName(oid,m[3]))?[oid]:[];
}else{for(var i=0;
ret[i];
i++){var tag=m[1]=="#"&&m[3]?m[3]:m[1]!=""||m[0]==""?"*":m[2];
if(tag=="*"&&ret[i].nodeName.toLowerCase()=="object"){tag="param";
}r=jQuery.merge(r,ret[i].getElementsByTagName(tag));
}if(m[1]=="."){r=jQuery.classFilter(r,m[2]);
}if(m[1]=="#"){var tmp=[];
for(var i=0;
r[i];
i++){if(r[i].getAttribute("id")==m[2]){tmp=[r[i]];
break;
}}r=tmp;
}ret=r;
}t=t.replace(re2,"");
}}if(t){var val=jQuery.filter(t,r);
ret=r=val.r;
t=jQuery.trim(val.t);
}}if(t){ret=[];
}if(ret&&context==ret[0]){ret.shift();
}done=jQuery.merge(done,ret);
return done;
},classFilter:function(r,m,not){m=" "+m+" ";
var tmp=[];
for(var i=0;
r[i];
i++){var pass=(" "+r[i].className+" ").indexOf(m)>=0;
if(!not&&pass||not&&!pass){tmp.push(r[i]);
}}return tmp;
},filter:function(t,r,not){var last;
while(t&&t!=last){last=t;
var p=jQuery.parse,m;
for(var i=0;
p[i];
i++){m=p[i].exec(t);
if(m){t=t.substring(m[0].length);
m[2]=m[2].replace(/\\/g,"");
break;
}}if(!m){break;
}if(m[1]==":"&&m[2]=="not"){r=isSimple.test(m[3])?jQuery.filter(m[3],r,true).r:jQuery(r).not(m[3]);
}else{if(m[1]=="."){r=jQuery.classFilter(r,m[2],not);
}else{if(m[1]=="["){var tmp=[],type=m[3];
for(var i=0,rl=r.length;
i<rl;
i++){var a=r[i],z=a[jQuery.props[m[2]]||m[2]];
if(z==null||/href|src|selected/.test(m[2])){z=jQuery.attr(a,m[2])||"";
}if((type==""&&!!z||type=="="&&z==m[5]||type=="!="&&z!=m[5]||type=="^="&&z&&!z.indexOf(m[5])||type=="$="&&z.substr(z.length-m[5].length)==m[5]||(type=="*="||type=="~=")&&z.indexOf(m[5])>=0)^not){tmp.push(a);
}}r=tmp;
}else{if(m[1]==":"&&m[2]=="nth-child"){var merge={},tmp=[],test=/(-?)(\d*)n((?:\+|-)?\d*)/.exec(m[3]=="even"&&"2n"||m[3]=="odd"&&"2n+1"||!/\D/.test(m[3])&&"0n+"+m[3]||m[3]),first=(test[1]+(test[2]||1))-0,last=test[3]-0;
for(var i=0,rl=r.length;
i<rl;
i++){var node=r[i],parentNode=node.parentNode,id=jQuery.data(parentNode);
if(!merge[id]){var c=1;
for(var n=parentNode.firstChild;
n;
n=n.nextSibling){if(n.nodeType==1){n.nodeIndex=c++;
}}merge[id]=true;
}var add=false;
if(first==0){if(node.nodeIndex==last){add=true;
}}else{if((node.nodeIndex-last)%first==0&&(node.nodeIndex-last)/first>=0){add=true;
}}if(add^not){tmp.push(node);
}}r=tmp;
}else{var fn=jQuery.expr[m[1]];
if(typeof fn=="object"){fn=fn[m[2]];
}if(typeof fn=="string"){fn=eval("false||function(a,i){return "+fn+";}");
}r=jQuery.grep(r,function(elem,i){return fn(elem,i,m,r);
},not);
}}}}}return{r:r,t:t};
},dir:function(elem,dir){var matched=[];
var cur=elem[dir];
while(cur&&cur!=document){if(cur.nodeType==1){matched.push(cur);
}cur=cur[dir];
}return matched;
},nth:function(cur,result,dir,elem){result=result||1;
var num=0;
for(;
cur;
cur=cur[dir]){if(cur.nodeType==1&&++num==result){break;
}}return cur;
},sibling:function(n,elem){var r=[];
for(;
n;
n=n.nextSibling){if(n.nodeType==1&&(!elem||n!=elem)){r.push(n);
}}return r;
}});
jQuery.event={add:function(elem,types,handler,data){if(elem.nodeType==3||elem.nodeType==8){return ;
}if(jQuery.browser.msie&&elem.setInterval!=undefined){elem=window;
}if(!handler.guid){handler.guid=this.guid++;
}if(data!=undefined){var fn=handler;
handler=function(){return fn.apply(this,arguments);
};
handler.data=data;
handler.guid=fn.guid;
}var events=jQuery.data(elem,"events")||jQuery.data(elem,"events",{}),handle=jQuery.data(elem,"handle")||jQuery.data(elem,"handle",function(){var val;
if(typeof jQuery=="undefined"||jQuery.event.triggered){return val;
}val=jQuery.event.handle.apply(arguments.callee.elem,arguments);
return val;
});
handle.elem=elem;
jQuery.each(types.split(/\s+/),function(index,type){var parts=type.split(".");
type=parts[0];
handler.type=parts[1];
var handlers=events[type];
if(!handlers){handlers=events[type]={};
if(!jQuery.event.special[type]||jQuery.event.special[type].setup.call(elem)===false){if(elem.addEventListener){elem.addEventListener(type,handle,false);
}else{if(elem.attachEvent){elem.attachEvent("on"+type,handle);
}}}}handlers[handler.guid]=handler;
jQuery.event.global[type]=true;
});
elem=null;
},guid:1,global:{},remove:function(elem,types,handler){if(elem.nodeType==3||elem.nodeType==8){return ;
}var events=jQuery.data(elem,"events"),ret,index;
if(events){if(types==undefined||(typeof types=="string"&&types.charAt(0)==".")){for(var type in events){this.remove(elem,type+(types||""));
}}else{if(types.type){handler=types.handler;
types=types.type;
}jQuery.each(types.split(/\s+/),function(index,type){var parts=type.split(".");
type=parts[0];
if(events[type]){if(handler){delete events[type][handler.guid];
}else{for(handler in events[type]){if(!parts[1]||events[type][handler].type==parts[1]){delete events[type][handler];
}}}for(ret in events[type]){break;
}if(!ret){if(!jQuery.event.special[type]||jQuery.event.special[type].teardown.call(elem)===false){if(elem.removeEventListener){elem.removeEventListener(type,jQuery.data(elem,"handle"),false);
}else{if(elem.detachEvent){elem.detachEvent("on"+type,jQuery.data(elem,"handle"));
}}}ret=null;
delete events[type];
}}});
}for(ret in events){break;
}if(!ret){var handle=jQuery.data(elem,"handle");
if(handle){handle.elem=null;
}jQuery.removeData(elem,"events");
jQuery.removeData(elem,"handle");
}}},trigger:function(type,data,elem,donative,extra){data=jQuery.makeArray(data||[]);
if(type.indexOf("!")>=0){type=type.slice(0,-1);
var exclusive=true;
}if(!elem){if(this.global[type]){jQuery("*").add([window,document]).trigger(type,data);
}}else{if(elem.nodeType==3||elem.nodeType==8){return undefined;
}var val,ret,fn=jQuery.isFunction(elem[type]||null),event=!data[0]||!data[0].preventDefault;
if(event){data.unshift(this.fix({type:type,target:elem}));
}data[0].type=type;
if(exclusive){data[0].exclusive=true;
}if(jQuery.isFunction(jQuery.data(elem,"handle"))){val=jQuery.data(elem,"handle").apply(elem,data);
}if(!fn&&elem["on"+type]&&elem["on"+type].apply(elem,data)===false){val=false;
}if(event){data.shift();
}if(extra&&jQuery.isFunction(extra)){ret=extra.apply(elem,val==null?data:data.concat(val));
if(ret!==undefined){val=ret;
}}if(fn&&donative!==false&&val!==false&&!(jQuery.nodeName(elem,"a")&&type=="click")){this.triggered=true;
try{elem[type]();
}catch(e){}}this.triggered=false;
}return val;
},handle:function(event){var val;
event=jQuery.event.fix(event||window.event||{});
var parts=event.type.split(".");
event.type=parts[0];
var handlers=jQuery.data(this,"events")&&jQuery.data(this,"events")[event.type],args=Array.prototype.slice.call(arguments,1);
args.unshift(event);
for(var j in handlers){var handler=handlers[j];
args[0].handler=handler;
args[0].data=handler.data;
if(!parts[1]&&!event.exclusive||handler.type==parts[1]){var ret=handler.apply(this,args);
if(val!==false){val=ret;
}if(ret===false){event.preventDefault();
event.stopPropagation();
}}}if(jQuery.browser.msie){event.target=event.preventDefault=event.stopPropagation=event.handler=event.data=null;
}return val;
},fix:function(event){var originalEvent=event;
event=jQuery.extend({},originalEvent);
event.preventDefault=function(){if(originalEvent.preventDefault){originalEvent.preventDefault();
}originalEvent.returnValue=false;
};
event.stopPropagation=function(){if(originalEvent.stopPropagation){originalEvent.stopPropagation();
}originalEvent.cancelBubble=true;
};
if(!event.target){event.target=event.srcElement||document;
}if(event.target.nodeType==3){event.target=originalEvent.target.parentNode;
}if(!event.relatedTarget&&event.fromElement){event.relatedTarget=event.fromElement==event.target?event.toElement:event.fromElement;
}if(event.pageX==null&&event.clientX!=null){var doc=document.documentElement,body=document.body;
event.pageX=event.clientX+(doc&&doc.scrollLeft||body&&body.scrollLeft||0)-(doc.clientLeft||0);
event.pageY=event.clientY+(doc&&doc.scrollTop||body&&body.scrollTop||0)-(doc.clientTop||0);
}if(!event.which&&((event.charCode||event.charCode===0)?event.charCode:event.keyCode)){event.which=event.charCode||event.keyCode;
}if(!event.metaKey&&event.ctrlKey){event.metaKey=event.ctrlKey;
}if(!event.which&&event.button){event.which=(event.button&1?1:(event.button&2?3:(event.button&4?2:0)));
}return event;
},special:{ready:{setup:function(){bindReady();
return ;
},teardown:function(){return ;
}},mouseenter:{setup:function(){if(jQuery.browser.msie){return false;
}jQuery(this).bind("mouseover",jQuery.event.special.mouseenter.handler);
return true;
},teardown:function(){if(jQuery.browser.msie){return false;
}jQuery(this).unbind("mouseover",jQuery.event.special.mouseenter.handler);
return true;
},handler:function(event){if(withinElement(event,this)){return true;
}arguments[0].type="mouseenter";
return jQuery.event.handle.apply(this,arguments);
}},mouseleave:{setup:function(){if(jQuery.browser.msie){return false;
}jQuery(this).bind("mouseout",jQuery.event.special.mouseleave.handler);
return true;
},teardown:function(){if(jQuery.browser.msie){return false;
}jQuery(this).unbind("mouseout",jQuery.event.special.mouseleave.handler);
return true;
},handler:function(event){if(withinElement(event,this)){return true;
}arguments[0].type="mouseleave";
return jQuery.event.handle.apply(this,arguments);
}}}};
jQuery.fn.extend({bind:function(type,data,fn){return type=="unload"?this.one(type,data,fn):this.each(function(){jQuery.event.add(this,type,fn||data,fn&&data);
});
},one:function(type,data,fn){return this.each(function(){jQuery.event.add(this,type,function(event){jQuery(this).unbind(event);
return(fn||data).apply(this,arguments);
},fn&&data);
});
},unbind:function(type,fn){return this.each(function(){jQuery.event.remove(this,type,fn);
});
},trigger:function(type,data,fn){return this.each(function(){jQuery.event.trigger(type,data,this,true,fn);
});
},triggerHandler:function(type,data,fn){if(this[0]){return jQuery.event.trigger(type,data,this[0],false,fn);
}return undefined;
},toggle:function(){var args=arguments;
return this.click(function(event){this.lastToggle=0==this.lastToggle?1:0;
event.preventDefault();
return args[this.lastToggle].apply(this,arguments)||false;
});
},hover:function(fnOver,fnOut){return this.bind("mouseenter",fnOver).bind("mouseleave",fnOut);
},ready:function(fn){bindReady();
if(jQuery.isReady){fn.call(document,jQuery);
}else{jQuery.readyList.push(function(){return fn.call(this,jQuery);
});
}return this;
}});
jQuery.extend({isReady:false,readyList:[],ready:function(){if(!jQuery.isReady){jQuery.isReady=true;
if(jQuery.readyList){jQuery.each(jQuery.readyList,function(){this.apply(document);
});
jQuery.readyList=null;
}jQuery(document).triggerHandler("ready");
}}});
var readyBound=false;
function bindReady(){if(readyBound){return ;
}readyBound=true;
if(document.addEventListener&&!jQuery.browser.opera){document.addEventListener("DOMContentLoaded",jQuery.ready,false);
}if(jQuery.browser.msie&&window==top){(function(){if(jQuery.isReady){return ;
}try{document.documentElement.doScroll("left");
}catch(error){setTimeout(arguments.callee,0);
return ;
}jQuery.ready();
})();
}if(jQuery.browser.opera){document.addEventListener("DOMContentLoaded",function(){if(jQuery.isReady){return ;
}for(var i=0;
i<document.styleSheets.length;
i++){if(document.styleSheets[i].disabled){setTimeout(arguments.callee,0);
return ;
}}jQuery.ready();
},false);
}if(jQuery.browser.safari){var numStyles;
(function(){if(jQuery.isReady){return ;
}if(document.readyState!="loaded"&&document.readyState!="complete"){setTimeout(arguments.callee,0);
return ;
}if(numStyles===undefined){numStyles=jQuery("style, link[rel=stylesheet]").length;
}if(document.styleSheets.length!=numStyles){setTimeout(arguments.callee,0);
return ;
}jQuery.ready();
})();
}jQuery.event.add(window,"load",jQuery.ready);
}jQuery.each(("blur,focus,load,resize,scroll,unload,click,dblclick,mousedown,mouseup,mousemove,mouseover,mouseout,change,select,submit,keydown,keypress,keyup,error").split(","),function(i,name){jQuery.fn[name]=function(fn){return fn?this.bind(name,fn):this.trigger(name);
};
});
var withinElement=function(event,elem){var parent=event.relatedTarget;
while(parent&&parent!=elem){try{parent=parent.parentNode;
}catch(error){parent=elem;
}}return parent==elem;
};
jQuery(window).bind("unload",function(){jQuery("*").add(document).unbind();
});
jQuery.fn.extend({load:function(url,params,callback){if(jQuery.isFunction(url)){return this.bind("load",url);
}var off=url.indexOf(" ");
if(off>=0){var selector=url.slice(off,url.length);
url=url.slice(0,off);
}callback=callback||function(){};
var type="GET";
if(params){if(jQuery.isFunction(params)){callback=params;
params=null;
}else{params=jQuery.param(params);
type="POST";
}}var self=this;
jQuery.ajax({url:url,type:type,dataType:"html",data:params,complete:function(res,status){if(status=="success"||status=="notmodified"){self.html(selector?jQuery("<div/>").append(res.responseText.replace(/<script(.|\s)*?\/script>/g,"")).find(selector):res.responseText);
}self.each(callback,[res.responseText,status,res]);
}});
return this;
},serialize:function(){return jQuery.param(this.serializeArray());
},serializeArray:function(){return this.map(function(){return jQuery.nodeName(this,"form")?jQuery.makeArray(this.elements):this;
}).filter(function(){return this.name&&!this.disabled&&(this.checked||/select|textarea/i.test(this.nodeName)||/text|hidden|password/i.test(this.type));
}).map(function(i,elem){var val=jQuery(this).val();
return val==null?null:val.constructor==Array?jQuery.map(val,function(val,i){return{name:elem.name,value:val};
}):{name:elem.name,value:val};
}).get();
}});
jQuery.each("ajaxStart,ajaxStop,ajaxComplete,ajaxError,ajaxSuccess,ajaxSend".split(","),function(i,o){jQuery.fn[o]=function(f){return this.bind(o,f);
};
});
var jsc=(new Date).getTime();
jQuery.extend({get:function(url,data,callback,type){if(jQuery.isFunction(data)){callback=data;
data=null;
}return jQuery.ajax({type:"GET",url:url,data:data,success:callback,dataType:type});
},getScript:function(url,callback){return jQuery.get(url,null,callback,"script");
},getJSON:function(url,data,callback){return jQuery.get(url,data,callback,"json");
},post:function(url,data,callback,type){if(jQuery.isFunction(data)){callback=data;
data={};
}return jQuery.ajax({type:"POST",url:url,data:data,success:callback,dataType:type});
},ajaxSetup:function(settings){jQuery.extend(jQuery.ajaxSettings,settings);
},ajaxSettings:{global:true,type:"GET",timeout:0,contentType:"application/x-www-form-urlencoded",processData:true,async:true,data:null,username:null,password:null,accepts:{xml:"application/xml, text/xml",html:"text/html",script:"text/javascript, application/javascript",json:"application/json, text/javascript",text:"text/plain",_default:"*/*"}},lastModified:{},ajax:function(s){var jsonp,jsre=/=\?(&|$)/g,status,data;
s=jQuery.extend(true,s,jQuery.extend(true,{},jQuery.ajaxSettings,s));
if(s.data&&s.processData&&typeof s.data!="string"){s.data=jQuery.param(s.data);
}if(s.dataType=="jsonp"){if(s.type.toLowerCase()=="get"){if(!s.url.match(jsre)){s.url+=(s.url.match(/\?/)?"&":"?")+(s.jsonp||"callback")+"=?";
}}else{if(!s.data||!s.data.match(jsre)){s.data=(s.data?s.data+"&":"")+(s.jsonp||"callback")+"=?";
}}s.dataType="json";
}if(s.dataType=="json"&&(s.data&&s.data.match(jsre)||s.url.match(jsre))){jsonp="jsonp"+jsc++;
if(s.data){s.data=(s.data+"").replace(jsre,"="+jsonp+"$1");
}s.url=s.url.replace(jsre,"="+jsonp+"$1");
s.dataType="script";
window[jsonp]=function(tmp){data=tmp;
success();
complete();
window[jsonp]=undefined;
try{delete window[jsonp];
}catch(e){}if(head){head.removeChild(script);
}};
}if(s.dataType=="script"&&s.cache==null){s.cache=false;
}if(s.cache===false&&s.type.toLowerCase()=="get"){var ts=(new Date()).getTime();
var ret=s.url.replace(/(\?|&)_=.*?(&|$)/,"$1_="+ts+"$2");
s.url=ret+((ret==s.url)?(s.url.match(/\?/)?"&":"?")+"_="+ts:"");
}if(s.data&&s.type.toLowerCase()=="get"){s.url+=(s.url.match(/\?/)?"&":"?")+s.data;
s.data=null;
}if(s.global&&!jQuery.active++){jQuery.event.trigger("ajaxStart");
}if((!s.url.indexOf("http")||!s.url.indexOf("//"))&&s.dataType=="script"&&s.type.toLowerCase()=="get"){var head=document.getElementsByTagName("head")[0];
var script=document.createElement("script");
script.src=s.url;
if(s.scriptCharset){script.charset=s.scriptCharset;
}if(!jsonp){var done=false;
script.onload=script.onreadystatechange=function(){if(!done&&(!this.readyState||this.readyState=="loaded"||this.readyState=="complete")){done=true;
success();
complete();
head.removeChild(script);
}};
}head.appendChild(script);
return undefined;
}var requestDone=false;
var xml=window.ActiveXObject?new ActiveXObject("Microsoft.XMLHTTP"):new XMLHttpRequest();
xml.open(s.type,s.url,s.async,s.username,s.password);
try{if(s.data){xml.setRequestHeader("Content-Type",s.contentType);
}if(s.ifModified){xml.setRequestHeader("If-Modified-Since",jQuery.lastModified[s.url]||"Thu, 01 Jan 1970 00:00:00 GMT");
}xml.setRequestHeader("X-Requested-With","XMLHttpRequest");
xml.setRequestHeader("Accept",s.dataType&&s.accepts[s.dataType]?s.accepts[s.dataType]+", */*":s.accepts._default);
}catch(e){}if(s.beforeSend){s.beforeSend(xml);
}if(s.global){jQuery.event.trigger("ajaxSend",[xml,s]);
}var onreadystatechange=function(isTimeout){if(!requestDone&&xml&&(xml.readyState==4||isTimeout=="timeout")){requestDone=true;
if(ival){clearInterval(ival);
ival=null;
}status=isTimeout=="timeout"&&"timeout"||!jQuery.httpSuccess(xml)&&"error"||s.ifModified&&jQuery.httpNotModified(xml,s.url)&&"notmodified"||"success";
if(status=="success"){try{data=jQuery.httpData(xml,s.dataType);
}catch(e){status="parsererror";
}}if(status=="success"){var modRes;
try{modRes=xml.getResponseHeader("Last-Modified");
}catch(e){}if(s.ifModified&&modRes){jQuery.lastModified[s.url]=modRes;
}if(!jsonp){success();
}}else{jQuery.handleError(s,xml,status);
}complete();
if(s.async){xml=null;
}}};
if(s.async){var ival=setInterval(onreadystatechange,13);
if(s.timeout>0){setTimeout(function(){if(xml){xml.abort();
if(!requestDone){onreadystatechange("timeout");
}}},s.timeout);
}}try{xml.send(s.data);
}catch(e){jQuery.handleError(s,xml,null,e);
}if(!s.async){onreadystatechange();
}function success(){if(s.success){s.success(data,status);
}if(s.global){jQuery.event.trigger("ajaxSuccess",[xml,s]);
}}function complete(){if(s.complete){s.complete(xml,status);
}if(s.global){jQuery.event.trigger("ajaxComplete",[xml,s]);
}if(s.global&&!--jQuery.active){jQuery.event.trigger("ajaxStop");
}}return xml;
},handleError:function(s,xml,status,e){if(s.error){s.error(xml,status,e);
}if(s.global){jQuery.event.trigger("ajaxError",[xml,s,e]);
}},active:0,httpSuccess:function(r){try{return !r.status&&location.protocol=="file:"||(r.status>=200&&r.status<300)||r.status==304||r.status==1223||jQuery.browser.safari&&r.status==undefined;
}catch(e){}return false;
},httpNotModified:function(xml,url){try{var xmlRes=xml.getResponseHeader("Last-Modified");
return xml.status==304||xmlRes==jQuery.lastModified[url]||jQuery.browser.safari&&xml.status==undefined;
}catch(e){}return false;
},httpData:function(r,type){var ct=r.getResponseHeader("content-type");
var xml=type=="xml"||!type&&ct&&ct.indexOf("xml")>=0;
var data=xml?r.responseXML:r.responseText;
if(xml&&data.documentElement.tagName=="parsererror"){throw"parsererror";
}if(type=="script"){jQuery.globalEval(data);
}if(type=="json"){data=eval("("+data+")");
}return data;
},param:function(a){var s=[];
if(a.constructor==Array||a.jquery){jQuery.each(a,function(){s.push(encodeURIComponent(this.name)+"="+encodeURIComponent(this.value));
});
}else{for(var j in a){if(a[j]&&a[j].constructor==Array){jQuery.each(a[j],function(){s.push(encodeURIComponent(j)+"="+encodeURIComponent(this));
});
}else{s.push(encodeURIComponent(j)+"="+encodeURIComponent(a[j]));
}}}return s.join("&").replace(/%20/g,"+");
}});
jQuery.fn.extend({show:function(speed,callback){return speed?this.animate({height:"show",width:"show",opacity:"show"},speed,callback):this.filter(":hidden").each(function(){this.style.display=this.oldblock||"";
if(jQuery.css(this,"display")=="none"){var elem=jQuery("<"+this.tagName+" />").appendTo("body");
this.style.display=elem.css("display");
if(this.style.display=="none"){this.style.display="block";
}elem.remove();
}}).end();
},hide:function(speed,callback){return speed?this.animate({height:"hide",width:"hide",opacity:"hide"},speed,callback):this.filter(":visible").each(function(){this.oldblock=this.oldblock||jQuery.css(this,"display");
this.style.display="none";
}).end();
},_toggle:jQuery.fn.toggle,toggle:function(fn,fn2){return jQuery.isFunction(fn)&&jQuery.isFunction(fn2)?this._toggle(fn,fn2):fn?this.animate({height:"toggle",width:"toggle",opacity:"toggle"},fn,fn2):this.each(function(){jQuery(this)[jQuery(this).is(":hidden")?"show":"hide"]();
});
},slideDown:function(speed,callback){return this.animate({height:"show"},speed,callback);
},slideUp:function(speed,callback){return this.animate({height:"hide"},speed,callback);
},slideToggle:function(speed,callback){return this.animate({height:"toggle"},speed,callback);
},fadeIn:function(speed,callback){return this.animate({opacity:"show"},speed,callback);
},fadeOut:function(speed,callback){return this.animate({opacity:"hide"},speed,callback);
},fadeTo:function(speed,to,callback){return this.animate({opacity:to},speed,callback);
},animate:function(prop,speed,easing,callback){var optall=jQuery.speed(speed,easing,callback);
return this[optall.queue===false?"each":"queue"](function(){if(this.nodeType!=1){return false;
}var opt=jQuery.extend({},optall);
var hidden=jQuery(this).is(":hidden"),self=this;
for(var p in prop){if(prop[p]=="hide"&&hidden||prop[p]=="show"&&!hidden){return jQuery.isFunction(opt.complete)&&opt.complete.apply(this);
}if(p=="height"||p=="width"){opt.display=jQuery.css(this,"display");
opt.overflow=this.style.overflow;
}}if(opt.overflow!=null){this.style.overflow="hidden";
}opt.curAnim=jQuery.extend({},prop);
jQuery.each(prop,function(name,val){var e=new jQuery.fx(self,opt,name);
if(/toggle|show|hide/.test(val)){e[val=="toggle"?hidden?"show":"hide":val](prop);
}else{var parts=val.toString().match(/^([+-]=)?([\d+-.]+)(.*)$/),start=e.cur(true)||0;
if(parts){var end=parseFloat(parts[2]),unit=parts[3]||"px";
if(unit!="px"){self.style[name]=(end||1)+unit;
start=((end||1)/e.cur(true))*start;
self.style[name]=start+unit;
}if(parts[1]){end=((parts[1]=="-="?-1:1)*end)+start;
}e.custom(start,end,unit);
}else{e.custom(start,val,"");
}}});
return true;
});
},queue:function(type,fn){if(jQuery.isFunction(type)||(type&&type.constructor==Array)){fn=type;
type="fx";
}if(!type||(typeof type=="string"&&!fn)){return queue(this[0],type);
}return this.each(function(){if(fn.constructor==Array){queue(this,type,fn);
}else{queue(this,type).push(fn);
if(queue(this,type).length==1){fn.apply(this);
}}});
},stop:function(clearQueue,gotoEnd){var timers=jQuery.timers;
if(clearQueue){this.queue([]);
}this.each(function(){for(var i=timers.length-1;
i>=0;
i--){if(timers[i].elem==this){if(gotoEnd){timers[i](true);
}timers.splice(i,1);
}}});
if(!gotoEnd){this.dequeue();
}return this;
}});
var queue=function(elem,type,array){if(!elem){return undefined;
}type=type||"fx";
var q=jQuery.data(elem,type+"queue");
if(!q||array){q=jQuery.data(elem,type+"queue",array?jQuery.makeArray(array):[]);
}return q;
};
jQuery.fn.dequeue=function(type){type=type||"fx";
return this.each(function(){var q=queue(this,type);
q.shift();
if(q.length){q[0].apply(this);
}});
};
jQuery.extend({speed:function(speed,easing,fn){var opt=speed&&speed.constructor==Object?speed:{complete:fn||!fn&&easing||jQuery.isFunction(speed)&&speed,duration:speed,easing:fn&&easing||easing&&easing.constructor!=Function&&easing};
opt.duration=(opt.duration&&opt.duration.constructor==Number?opt.duration:{slow:600,fast:200}[opt.duration])||400;
opt.old=opt.complete;
opt.complete=function(){if(opt.queue!==false){jQuery(this).dequeue();
}if(jQuery.isFunction(opt.old)){opt.old.apply(this);
}};
return opt;
},easing:{linear:function(p,n,firstNum,diff){return firstNum+diff*p;
},swing:function(p,n,firstNum,diff){return((-Math.cos(p*Math.PI)/2)+0.5)*diff+firstNum;
}},timers:[],timerId:null,fx:function(elem,options,prop){this.options=options;
this.elem=elem;
this.prop=prop;
if(!options.orig){options.orig={};
}}});
jQuery.fx.prototype={update:function(){if(this.options.step){this.options.step.apply(this.elem,[this.now,this]);
}(jQuery.fx.step[this.prop]||jQuery.fx.step._default)(this);
if(this.prop=="height"||this.prop=="width"){this.elem.style.display="block";
}},cur:function(force){if(this.elem[this.prop]!=null&&this.elem.style[this.prop]==null){return this.elem[this.prop];
}var r=parseFloat(jQuery.css(this.elem,this.prop,force));
return r&&r>-10000?r:parseFloat(jQuery.curCSS(this.elem,this.prop))||0;
},custom:function(from,to,unit){this.startTime=(new Date()).getTime();
this.start=from;
this.end=to;
this.unit=unit||this.unit||"px";
this.now=this.start;
this.pos=this.state=0;
this.update();
var self=this;
function t(gotoEnd){return self.step(gotoEnd);
}t.elem=this.elem;
jQuery.timers.push(t);
if(jQuery.timerId==null){jQuery.timerId=setInterval(function(){var timers=jQuery.timers;
for(var i=0;
i<timers.length;
i++){if(!timers[i]()){timers.splice(i--,1);
}}if(!timers.length){clearInterval(jQuery.timerId);
jQuery.timerId=null;
}},13);
}},show:function(){this.options.orig[this.prop]=jQuery.attr(this.elem.style,this.prop);
this.options.show=true;
this.custom(0,this.cur());
if(this.prop=="width"||this.prop=="height"){this.elem.style[this.prop]="1px";
}jQuery(this.elem).show();
},hide:function(){this.options.orig[this.prop]=jQuery.attr(this.elem.style,this.prop);
this.options.hide=true;
this.custom(this.cur(),0);
},step:function(gotoEnd){var t=(new Date()).getTime();
if(gotoEnd||t>this.options.duration+this.startTime){this.now=this.end;
this.pos=this.state=1;
this.update();
this.options.curAnim[this.prop]=true;
var done=true;
for(var i in this.options.curAnim){if(this.options.curAnim[i]!==true){done=false;
}}if(done){if(this.options.display!=null){this.elem.style.overflow=this.options.overflow;
this.elem.style.display=this.options.display;
if(jQuery.css(this.elem,"display")=="none"){this.elem.style.display="block";
}}if(this.options.hide){this.elem.style.display="none";
}if(this.options.hide||this.options.show){for(var p in this.options.curAnim){jQuery.attr(this.elem.style,p,this.options.orig[p]);
}}}if(done&&jQuery.isFunction(this.options.complete)){this.options.complete.apply(this.elem);
}return false;
}else{var n=t-this.startTime;
this.state=n/this.options.duration;
this.pos=jQuery.easing[this.options.easing||(jQuery.easing.swing?"swing":"linear")](this.state,n,0,1,this.options.duration);
this.now=this.start+((this.end-this.start)*this.pos);
this.update();
}return true;
}};
jQuery.fx.step={scrollLeft:function(fx){fx.elem.scrollLeft=fx.now;
},scrollTop:function(fx){fx.elem.scrollTop=fx.now;
},opacity:function(fx){jQuery.attr(fx.elem.style,"opacity",fx.now);
},_default:function(fx){fx.elem.style[fx.prop]=fx.now+fx.unit;
}};
jQuery.fn.offset=function(){var left=0,top=0,elem=this[0],results;
if(elem){with(jQuery.browser){var parent=elem.parentNode,offsetChild=elem,offsetParent=elem.offsetParent,doc=elem.ownerDocument,safari2=safari&&parseInt(version)<522&&!/adobeair/i.test(userAgent),fixed=jQuery.css(elem,"position")=="fixed";
if(elem.getBoundingClientRect){var box=elem.getBoundingClientRect();
add(box.left+Math.max(doc.documentElement.scrollLeft,doc.body.scrollLeft),box.top+Math.max(doc.documentElement.scrollTop,doc.body.scrollTop));
add(-doc.documentElement.clientLeft,-doc.documentElement.clientTop);
}else{add(elem.offsetLeft,elem.offsetTop);
while(offsetParent){add(offsetParent.offsetLeft,offsetParent.offsetTop);
if(mozilla&&!/^t(able|d|h)$/i.test(offsetParent.tagName)||safari&&!safari2){border(offsetParent);
}if(!fixed&&jQuery.css(offsetParent,"position")=="fixed"){fixed=true;
}offsetChild=/^body$/i.test(offsetParent.tagName)?offsetChild:offsetParent;
offsetParent=offsetParent.offsetParent;
}while(parent&&parent.tagName&&!/^body|html$/i.test(parent.tagName)){if(!/^inline|table.*$/i.test(jQuery.css(parent,"display"))){add(-parent.scrollLeft,-parent.scrollTop);
}if(mozilla&&jQuery.css(parent,"overflow")!="visible"){border(parent);
}parent=parent.parentNode;
}if((safari2&&(fixed||jQuery.css(offsetChild,"position")=="absolute"))||(mozilla&&jQuery.css(offsetChild,"position")!="absolute")){add(-doc.body.offsetLeft,-doc.body.offsetTop);
}if(fixed){add(Math.max(doc.documentElement.scrollLeft,doc.body.scrollLeft),Math.max(doc.documentElement.scrollTop,doc.body.scrollTop));
}}results={top:top,left:left};
}}function border(elem){add(jQuery.curCSS(elem,"borderLeftWidth",true),jQuery.curCSS(elem,"borderTopWidth",true));
}function add(l,t){left+=parseInt(l)||0;
top+=parseInt(t)||0;
}return results;
};
})();


/* platform.js */
SimileAjax.jQuery=jQuery.noConflict(true);
if(typeof window["$"]=="undefined"){window.$=SimileAjax.jQuery;
}SimileAjax.Platform.os={isMac:false,isWin:false,isWin32:false,isUnix:false};
SimileAjax.Platform.browser={isIE:false,isNetscape:false,isMozilla:false,isFirefox:false,isOpera:false,isSafari:false,majorVersion:0,minorVersion:0};
(function(){var C=navigator.appName.toLowerCase();
var A=navigator.userAgent.toLowerCase();
SimileAjax.Platform.os.isMac=(A.indexOf("mac")!=-1);
SimileAjax.Platform.os.isWin=(A.indexOf("win")!=-1);
SimileAjax.Platform.os.isWin32=SimileAjax.Platform.isWin&&(A.indexOf("95")!=-1||A.indexOf("98")!=-1||A.indexOf("nt")!=-1||A.indexOf("win32")!=-1||A.indexOf("32bit")!=-1);
SimileAjax.Platform.os.isUnix=(A.indexOf("x11")!=-1);
SimileAjax.Platform.browser.isIE=(C.indexOf("microsoft")!=-1);
SimileAjax.Platform.browser.isNetscape=(C.indexOf("netscape")!=-1);
SimileAjax.Platform.browser.isMozilla=(A.indexOf("mozilla")!=-1);
SimileAjax.Platform.browser.isFirefox=(A.indexOf("firefox")!=-1);
SimileAjax.Platform.browser.isOpera=(C.indexOf("opera")!=-1);
SimileAjax.Platform.browser.isSafari=(C.indexOf("safari")!=-1);
var E=function(G){var F=G.split(".");
SimileAjax.Platform.browser.majorVersion=parseInt(F[0]);
SimileAjax.Platform.browser.minorVersion=parseInt(F[1]);
};
var B=function(H,G,I){var F=H.indexOf(G,I);
return F>=0?F:H.length;
};
if(SimileAjax.Platform.browser.isMozilla){var D=A.indexOf("mozilla/");
if(D>=0){E(A.substring(D+8,B(A," ",D)));
}}if(SimileAjax.Platform.browser.isIE){var D=A.indexOf("msie ");
if(D>=0){E(A.substring(D+5,B(A,";",D)));
}}if(SimileAjax.Platform.browser.isNetscape){var D=A.indexOf("rv:");
if(D>=0){E(A.substring(D+3,B(A,")",D)));
}}if(SimileAjax.Platform.browser.isFirefox){var D=A.indexOf("firefox/");
if(D>=0){E(A.substring(D+8,B(A," ",D)));
}}if(!("localeCompare" in String.prototype)){String.prototype.localeCompare=function(F){if(this<F){return -1;
}else{if(this>F){return 1;
}else{return 0;
}}};
}})();
SimileAjax.Platform.getDefaultLocale=function(){return SimileAjax.Platform.clientLocale;
};


/* ajax.js */
SimileAjax.ListenerQueue=function(A){this._listeners=[];
this._wildcardHandlerName=A;
};
SimileAjax.ListenerQueue.prototype.add=function(A){this._listeners.push(A);
};
SimileAjax.ListenerQueue.prototype.remove=function(C){var B=this._listeners;
for(var A=0;
A<B.length;
A++){if(B[A]==C){B.splice(A,1);
break;
}}};
SimileAjax.ListenerQueue.prototype.fire=function(B,A){var D=[].concat(this._listeners);
for(var C=0;
C<D.length;
C++){var E=D[C];
if(B in E){try{E[B].apply(E,A);
}catch(F){SimileAjax.Debug.exception("Error firing event of name "+B,F);
}}else{if(this._wildcardHandlerName!=null&&this._wildcardHandlerName in E){try{E[this._wildcardHandlerName].apply(E,[B]);
}catch(F){SimileAjax.Debug.exception("Error firing event of name "+B+" to wildcard handler",F);
}}}}};

SimileAjax.parseURLParameters = function(url, to, types) {
to = to || {};
types = types || {};

if (typeof url == "undefined") {
url = location.href;
}
var q = url.indexOf("?");
if (q < 0) {
return to;
}
url = (url+"#").slice(q+1, url.indexOf("#")); // toss the URL fragment

var params = url.split("&"), param, parsed = {};
var decode = window.decodeURIComponent || unescape;
for (var i = 0; param = params[i]; i++) {
var eq = param.indexOf("=");
var name = decode(param.slice(0,eq));
var old = parsed[name];
if (typeof old == "undefined") {
old = [];
} else if (!(old instanceof Array)) {
old = [old];
}
parsed[name] = old.concat(decode(param.slice(eq+1)));
}
for (var i in parsed) {
if (!parsed.hasOwnProperty(i)) continue;
var type = types[i] || String;
var data = parsed[i];
if (!(data instanceof Array)) {
data = [data];
}
if (type === Boolean && data[0] == "false") {
to[i] = false; // because Boolean("false") === true
} else {
to[i] = type.apply(this, data);
}
}
return to;
};

/* data-structure.js */
SimileAjax.Set=function(A){this._hash={};
this._count=0;
if(A instanceof Array){for(var B=0;
B<A.length;
B++){this.add(A[B]);
}}else{if(A instanceof SimileAjax.Set){this.addSet(A);
}}};
SimileAjax.Set.prototype.add=function(A){if(!(A in this._hash)){this._hash[A]=true;
this._count++;
return true;
}return false;
};
SimileAjax.Set.prototype.addSet=function(B){for(var A in B._hash){this.add(A);
}};
SimileAjax.Set.prototype.remove=function(A){if(A in this._hash){delete this._hash[A];
this._count--;
return true;
}return false;
};
SimileAjax.Set.prototype.removeSet=function(B){for(var A in B._hash){this.remove(A);
}};
SimileAjax.Set.prototype.retainSet=function(B){for(var A in this._hash){if(!B.contains(A)){delete this._hash[A];
this._count--;
}}};
SimileAjax.Set.prototype.contains=function(A){return(A in this._hash);
};
SimileAjax.Set.prototype.size=function(){return this._count;
};
SimileAjax.Set.prototype.toArray=function(){var A=[];
for(var B in this._hash){A.push(B);
}return A;
};
SimileAjax.Set.prototype.visit=function(A){for(var B in this._hash){if(A(B)==true){break;
}}};
SimileAjax.SortedArray=function(B,A){this._a=(A instanceof Array)?A:[];
this._compare=B;
};
SimileAjax.SortedArray.prototype.add=function(C){var A=this;
var B=this.find(function(D){return A._compare(D,C);
});
if(B<this._a.length){this._a.splice(B,0,C);
}else{this._a.push(C);
}};
SimileAjax.SortedArray.prototype.remove=function(C){var A=this;
var B=this.find(function(D){return A._compare(D,C);
});
while(B<this._a.length&&this._compare(this._a[B],C)==0){if(this._a[B]==C){this._a.splice(B,1);
return true;
}else{B++;
}}return false;
};
SimileAjax.SortedArray.prototype.removeAll=function(){this._a=[];
};
SimileAjax.SortedArray.prototype.elementAt=function(A){return this._a[A];
};
SimileAjax.SortedArray.prototype.length=function(){return this._a.length;
};
SimileAjax.SortedArray.prototype.find=function(D){var B=0;
var A=this._a.length;
while(B<A){var C=Math.floor((B+A)/2);
var E=D(this._a[C]);
if(C==B){return E<0?B+1:B;
}else{if(E<0){B=C;
}else{A=C;
}}}return B;
};
SimileAjax.SortedArray.prototype.getFirst=function(){return(this._a.length>0)?this._a[0]:null;
};
SimileAjax.SortedArray.prototype.getLast=function(){return(this._a.length>0)?this._a[this._a.length-1]:null;
};
SimileAjax.EventIndex=function(B){var A=this;
this._unit=(B!=null)?B:SimileAjax.NativeDateUnit;
this._events=new SimileAjax.SortedArray(function(D,C){return A._unit.compare(D.getStart(),C.getStart());
});
this._idToEvent={};
this._indexed=true;
};
SimileAjax.EventIndex.prototype.getUnit=function(){return this._unit;
};
SimileAjax.EventIndex.prototype.getEvent=function(A){return this._idToEvent[A];
};
SimileAjax.EventIndex.prototype.add=function(A){this._events.add(A);
this._idToEvent[A.getID()]=A;
this._indexed=false;
};
SimileAjax.EventIndex.prototype.removeAll=function(){this._events.removeAll();
this._idToEvent={};
this._indexed=false;
};
SimileAjax.EventIndex.prototype.getCount=function(){return this._events.length();
};
SimileAjax.EventIndex.prototype.getIterator=function(A,B){if(!this._indexed){this._index();
}return new SimileAjax.EventIndex._Iterator(this._events,A,B,this._unit);
};
SimileAjax.EventIndex.prototype.getReverseIterator=function(A,B){if(!this._indexed){this._index();
}return new SimileAjax.EventIndex._ReverseIterator(this._events,A,B,this._unit);
};
SimileAjax.EventIndex.prototype.getAllIterator=function(){return new SimileAjax.EventIndex._AllIterator(this._events);
};
SimileAjax.EventIndex.prototype.getEarliestDate=function(){var A=this._events.getFirst();
return(A==null)?null:A.getStart();
};
SimileAjax.EventIndex.prototype.getLatestDate=function(){var A=this._events.getLast();
if(A==null){return null;
}if(!this._indexed){this._index();
}var C=A._earliestOverlapIndex;
var B=this._events.elementAt(C).getEnd();
for(var D=C+1;
D<this._events.length();
D++){B=this._unit.later(B,this._events.elementAt(D).getEnd());
}return B;
};
SimileAjax.EventIndex.prototype._index=function(){var D=this._events.length();
for(var E=0;
E<D;
E++){var C=this._events.elementAt(E);
C._earliestOverlapIndex=E;
}var G=1;
for(var E=0;
E<D;
E++){var C=this._events.elementAt(E);
var B=C.getEnd();
G=Math.max(G,E+1);
while(G<D){var A=this._events.elementAt(G);
var F=A.getStart();
if(this._unit.compare(F,B)<0){A._earliestOverlapIndex=E;
G++;
}else{break;
}}}this._indexed=true;
};
SimileAjax.EventIndex._Iterator=function(B,A,D,C){this._events=B;
this._startDate=A;
this._endDate=D;
this._unit=C;
this._currentIndex=B.find(function(E){return C.compare(E.getStart(),A);
});
if(this._currentIndex-1>=0){this._currentIndex=this._events.elementAt(this._currentIndex-1)._earliestOverlapIndex;
}this._currentIndex--;
this._maxIndex=B.find(function(E){return C.compare(E.getStart(),D);
});
this._hasNext=false;
this._next=null;
this._findNext();
};
SimileAjax.EventIndex._Iterator.prototype={hasNext:function(){return this._hasNext;
},next:function(){if(this._hasNext){var A=this._next;
this._findNext();
return A;
}else{return null;
}},_findNext:function(){var B=this._unit;
while((++this._currentIndex)<this._maxIndex){var A=this._events.elementAt(this._currentIndex);
if(B.compare(A.getStart(),this._endDate)<0&&B.compare(A.getEnd(),this._startDate)>0){this._next=A;
this._hasNext=true;
return ;
}}this._next=null;
this._hasNext=false;
}};
SimileAjax.EventIndex._ReverseIterator=function(B,A,D,C){this._events=B;
this._startDate=A;
this._endDate=D;
this._unit=C;
this._minIndex=B.find(function(E){return C.compare(E.getStart(),A);
});
if(this._minIndex-1>=0){this._minIndex=this._events.elementAt(this._minIndex-1)._earliestOverlapIndex;
}this._maxIndex=B.find(function(E){return C.compare(E.getStart(),D);
});
this._currentIndex=this._maxIndex;
this._hasNext=false;
this._next=null;
this._findNext();
};
SimileAjax.EventIndex._ReverseIterator.prototype={hasNext:function(){return this._hasNext;
},next:function(){if(this._hasNext){var A=this._next;
this._findNext();
return A;
}else{return null;
}},_findNext:function(){var B=this._unit;
while((--this._currentIndex)>=this._minIndex){var A=this._events.elementAt(this._currentIndex);
if(B.compare(A.getStart(),this._endDate)<0&&B.compare(A.getEnd(),this._startDate)>0){this._next=A;
this._hasNext=true;
return ;
}}this._next=null;
this._hasNext=false;
}};
SimileAjax.EventIndex._AllIterator=function(A){this._events=A;
this._index=0;
};
SimileAjax.EventIndex._AllIterator.prototype={hasNext:function(){return this._index<this._events.length();
},next:function(){return this._index<this._events.length()?this._events.elementAt(this._index++):null;
}};


/* date-time.js */
SimileAjax.DateTime=new Object();
SimileAjax.DateTime.MILLISECOND=0;
SimileAjax.DateTime.SECOND=1;
SimileAjax.DateTime.MINUTE=2;
SimileAjax.DateTime.HOUR=3;
SimileAjax.DateTime.DAY=4;
SimileAjax.DateTime.WEEK=5;
SimileAjax.DateTime.MONTH=6;
SimileAjax.DateTime.YEAR=7;
SimileAjax.DateTime.DECADE=8;
SimileAjax.DateTime.CENTURY=9;
SimileAjax.DateTime.MILLENNIUM=10;
SimileAjax.DateTime.EPOCH=-1;
SimileAjax.DateTime.ERA=-2;
SimileAjax.DateTime.gregorianUnitLengths=[];
(function(){var B=SimileAjax.DateTime;
var A=B.gregorianUnitLengths;
A[B.MILLISECOND]=1;
A[B.SECOND]=1000;
A[B.MINUTE]=A[B.SECOND]*60;
A[B.HOUR]=A[B.MINUTE]*60;
A[B.DAY]=A[B.HOUR]*24;
A[B.WEEK]=A[B.DAY]*7;
A[B.MONTH]=A[B.DAY]*31;
A[B.YEAR]=A[B.DAY]*365;
A[B.DECADE]=A[B.YEAR]*10;
A[B.CENTURY]=A[B.YEAR]*100;
A[B.MILLENNIUM]=A[B.YEAR]*1000;
})();
SimileAjax.DateTime._dateRegexp=new RegExp("^(-?)([0-9]{4})("+["(-?([0-9]{2})(-?([0-9]{2}))?)","(-?([0-9]{3}))","(-?W([0-9]{2})(-?([1-7]))?)"].join("|")+")?$");
SimileAjax.DateTime._timezoneRegexp=new RegExp("Z|(([-+])([0-9]{2})(:?([0-9]{2}))?)$");
SimileAjax.DateTime._timeRegexp=new RegExp("^([0-9]{2})(:?([0-9]{2})(:?([0-9]{2})(.([0-9]+))?)?)?$");
SimileAjax.DateTime.setIso8601Date=function(H,F){var I=F.match(SimileAjax.DateTime._dateRegexp);
if(!I){throw new Error("Invalid date string: "+F);
}var B=(I[1]=="-")?-1:1;
var J=B*I[2];
var G=I[5];
var C=I[7];
var E=I[9];
var A=I[11];
var M=(I[13])?I[13]:1;
H.setUTCFullYear(J);
if(E){H.setUTCMonth(0);
H.setUTCDate(Number(E));
}else{if(A){H.setUTCMonth(0);
H.setUTCDate(1);
var L=H.getUTCDay();
var K=(L)?L:7;
var D=Number(M)+(7*Number(A));
if(K<=4){H.setUTCDate(D+1-K);
}else{H.setUTCDate(D+8-K);
}}else{if(G){H.setUTCDate(1);
H.setUTCMonth(G-1);
}if(C){H.setUTCDate(C);
}}}return H;
};
SimileAjax.DateTime.setIso8601Time=function(F,C){var G=C.match(SimileAjax.DateTime._timeRegexp);
if(!G){SimileAjax.Debug.warn("Invalid time string: "+C);
return false;
}var A=G[1];
var E=Number((G[3])?G[3]:0);
var D=(G[5])?G[5]:0;
var B=G[7]?(Number("0."+G[7])*1000):0;
F.setUTCHours(A);
F.setUTCMinutes(E);
F.setUTCSeconds(D);
F.setUTCMilliseconds(B);
return F;
};
SimileAjax.DateTime.timezoneOffset=new Date().getTimezoneOffset();
SimileAjax.DateTime.setIso8601=function(B,A){var D=null;
var E=(A.indexOf("T")==-1)?A.split(" "):A.split("T");
SimileAjax.DateTime.setIso8601Date(B,E[0]);
if(E.length==2){var C=E[1].match(SimileAjax.DateTime._timezoneRegexp);
if(C){if(C[0]=="Z"){D=0;
}else{D=(Number(C[3])*60)+Number(C[5]);
D*=((C[2]=="-")?1:-1);
}E[1]=E[1].substr(0,E[1].length-C[0].length);
}SimileAjax.DateTime.setIso8601Time(B,E[1]);
}if(D==null){D=B.getTimezoneOffset();
}B.setTime(B.getTime()+D*60000);
return B;
};
SimileAjax.DateTime.parseIso8601DateTime=function(A){try{return SimileAjax.DateTime.setIso8601(new Date(0),A);
}catch(B){return null;
}};
SimileAjax.DateTime.parseGregorianDateTime=function(G){if(G==null){return null;
}else{if(G instanceof Date){return G;
}}var B=G.toString();
if(B.length>0&&B.length<8){var C=B.indexOf(" ");
if(C>0){var A=parseInt(B.substr(0,C));
var E=B.substr(C+1);
if(E.toLowerCase()=="bc"){A=1-A;
}}else{var A=parseInt(B);
}var F=new Date(0);
F.setUTCFullYear(A);
return F;
}try{return new Date(Date.parse(B));
}catch(D){return null;
}};
SimileAjax.DateTime.roundDownToInterval=function(B,G,J,K,A){var D=J*SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.HOUR];
var I=new Date(B.getTime()+D);
var E=function(L){L.setUTCMilliseconds(0);
L.setUTCSeconds(0);
L.setUTCMinutes(0);
L.setUTCHours(0);
};
var C=function(L){E(L);
L.setUTCDate(1);
L.setUTCMonth(0);
};
switch(G){case SimileAjax.DateTime.MILLISECOND:var H=I.getUTCMilliseconds();
I.setUTCMilliseconds(H-(H%K));
break;
case SimileAjax.DateTime.SECOND:I.setUTCMilliseconds(0);
var H=I.getUTCSeconds();
I.setUTCSeconds(H-(H%K));
break;
case SimileAjax.DateTime.MINUTE:I.setUTCMilliseconds(0);
I.setUTCSeconds(0);
var H=I.getUTCMinutes();
I.setTime(I.getTime()-(H%K)*SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.MINUTE]);
break;
case SimileAjax.DateTime.HOUR:I.setUTCMilliseconds(0);
I.setUTCSeconds(0);
I.setUTCMinutes(0);
var H=I.getUTCHours();
I.setUTCHours(H-(H%K));
break;
case SimileAjax.DateTime.DAY:E(I);
break;
case SimileAjax.DateTime.WEEK:E(I);
var F=(I.getUTCDay()+7-A)%7;
I.setTime(I.getTime()-F*SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.DAY]);
break;
case SimileAjax.DateTime.MONTH:E(I);
I.setUTCDate(1);
var H=I.getUTCMonth();
I.setUTCMonth(H-(H%K));
break;
case SimileAjax.DateTime.YEAR:C(I);
var H=I.getUTCFullYear();
I.setUTCFullYear(H-(H%K));
break;
case SimileAjax.DateTime.DECADE:C(I);
I.setUTCFullYear(Math.floor(I.getUTCFullYear()/10)*10);
break;
case SimileAjax.DateTime.CENTURY:C(I);
I.setUTCFullYear(Math.floor(I.getUTCFullYear()/100)*100);
break;
case SimileAjax.DateTime.MILLENNIUM:C(I);
I.setUTCFullYear(Math.floor(I.getUTCFullYear()/1000)*1000);
break;
}B.setTime(I.getTime()-D);
};
SimileAjax.DateTime.roundUpToInterval=function(D,F,C,A,B){var E=D.getTime();
SimileAjax.DateTime.roundDownToInterval(D,F,C,A,B);
if(D.getTime()<E){D.setTime(D.getTime()+SimileAjax.DateTime.gregorianUnitLengths[F]*A);
}};
SimileAjax.DateTime.incrementByInterval=function(B,E,A){A=(typeof A=="undefined")?0:A;
var D=A*SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.HOUR];
var C=new Date(B.getTime()+D);
switch(E){case SimileAjax.DateTime.MILLISECOND:C.setTime(C.getTime()+1);
break;
case SimileAjax.DateTime.SECOND:C.setTime(C.getTime()+1000);
break;
case SimileAjax.DateTime.MINUTE:C.setTime(C.getTime()+SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.MINUTE]);
break;
case SimileAjax.DateTime.HOUR:C.setTime(C.getTime()+SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.HOUR]);
break;
case SimileAjax.DateTime.DAY:C.setUTCDate(C.getUTCDate()+1);
break;
case SimileAjax.DateTime.WEEK:C.setUTCDate(C.getUTCDate()+7);
break;
case SimileAjax.DateTime.MONTH:C.setUTCMonth(C.getUTCMonth()+1);
break;
case SimileAjax.DateTime.YEAR:C.setUTCFullYear(C.getUTCFullYear()+1);
break;
case SimileAjax.DateTime.DECADE:C.setUTCFullYear(C.getUTCFullYear()+10);
break;
case SimileAjax.DateTime.CENTURY:C.setUTCFullYear(C.getUTCFullYear()+100);
break;
case SimileAjax.DateTime.MILLENNIUM:C.setUTCFullYear(C.getUTCFullYear()+1000);
break;
}B.setTime(C.getTime()-D);
};
SimileAjax.DateTime.removeTimeZoneOffset=function(B,A){return new Date(B.getTime()+A*SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.HOUR]);
};
SimileAjax.DateTime.getTimezone=function(){var A=new Date().getTimezoneOffset();
return A/-60;
};


/* debug.js */
SimileAjax.Debug={silent:false};
SimileAjax.Debug.log=function(B){var A;
if("console" in window&&"log" in window.console){A=function(C){console.log(C);
};
}else{A=function(C){if(!SimileAjax.Debug.silent){alert(C);
}};
}SimileAjax.Debug.log=A;
A(B);
};
SimileAjax.Debug.warn=function(B){var A;
if("console" in window&&"warn" in window.console){A=function(C){console.warn(C);
};
}else{A=function(C){if(!SimileAjax.Debug.silent){alert(C);
}};
}SimileAjax.Debug.warn=A;
A(B);
};
SimileAjax.Debug.exception=function(B,D){var A,C=SimileAjax.parseURLParameters();
if(C.errors=="throw"||SimileAjax.params.errors=="throw"){A=function(F,E){throw (F);
};
}else{if("console" in window&&"error" in window.console){A=function(F,E){if(E!=null){console.error(E+" %o",F);
}else{console.error(F);
}throw (F);
};
}else{A=function(F,E){if(!SimileAjax.Debug.silent){alert("Caught exception: "+E+"\n\nDetails: "+("description" in F?F.description:F));
}throw (F);
};
}}SimileAjax.Debug.exception=A;
A(B,D);
};
SimileAjax.Debug.objectToString=function(A){return SimileAjax.Debug._objectToString(A,"");
};
SimileAjax.Debug._objectToString=function(D,A){var C=A+" ";
if(typeof D=="object"){var B="{";
for(E in D){B+=C+E+": "+SimileAjax.Debug._objectToString(D[E],C)+"\n";
}B+=A+"}";
return B;
}else{if(typeof D=="array"){var B="[";
for(var E=0;
E<D.length;
E++){B+=SimileAjax.Debug._objectToString(D[E],C)+"\n";
}B+=A+"]";
return B;
}else{return D;
}}};


/* dom.js */
SimileAjax.DOM=new Object();
SimileAjax.DOM.registerEventWithObject=function(C,A,D,B){SimileAjax.DOM.registerEvent(C,A,function(F,E,G){return D[B].call(D,F,E,G);
});
};
SimileAjax.DOM.registerEvent=function(C,B,D){var A=function(E){E=(E)?E:((event)?event:null);
if(E){var F=(E.target)?E.target:((E.srcElement)?E.srcElement:null);
if(F){F=(F.nodeType==1||F.nodeType==9)?F:F.parentNode;
}return D(C,E,F);
}return true;
};
if(SimileAjax.Platform.browser.isIE){C.attachEvent("on"+B,A);
}else{C.addEventListener(B,A,false);
}};
SimileAjax.DOM.getPageCoordinates=function(B){var E=0;
var D=0;
if(B.nodeType!=1){B=B.parentNode;
}var C=B;
while(C!=null){E+=C.offsetLeft;
D+=C.offsetTop;
C=C.offsetParent;
}var A=document.body;
while(B!=null&&B!=A){if("scrollLeft" in B){E-=B.scrollLeft;
D-=B.scrollTop;
}B=B.parentNode;
}return{left:E,top:D};
};
SimileAjax.DOM.getSize=function(B){var A=this.getStyle(B,"width");
var C=this.getStyle(B,"height");
if(A.indexOf("px")>-1){A=A.replace("px","");
}if(C.indexOf("px")>-1){C=C.replace("px","");
}return{w:A,h:C};
};
SimileAjax.DOM.getStyle=function(B,A){if(B.currentStyle){var C=B.currentStyle[A];
}else{if(window.getComputedStyle){var C=document.defaultView.getComputedStyle(B,null).getPropertyValue(A);
}else{var C="";
}}return C;
};
SimileAjax.DOM.getEventRelativeCoordinates=function(A,B){if(SimileAjax.Platform.browser.isIE){return{x:A.offsetX,y:A.offsetY};
}else{var C=SimileAjax.DOM.getPageCoordinates(B);
return{x:A.pageX-C.left,y:A.pageY-C.top};
}};
SimileAjax.DOM.getEventPageCoordinates=function(A){if(SimileAjax.Platform.browser.isIE){return{x:A.clientX+document.body.scrollLeft,y:A.clientY+document.body.scrollTop};
}else{return{x:A.pageX,y:A.pageY};
}};
SimileAjax.DOM.hittest=function(A,C,B){return SimileAjax.DOM._hittest(document.body,A,C,B);
};
SimileAjax.DOM._hittest=function(C,L,K,H){var M=C.childNodes;
outer:for(var G=0;
G<M.length;
G++){var A=M[G];
for(var F=0;
F<H.length;
F++){if(A==H[F]){continue outer;
}}if(A.offsetWidth==0&&A.offsetHeight==0){var B=SimileAjax.DOM._hittest(A,L,K,H);
if(B!=A){return B;
}}else{var J=0;
var E=0;
var D=A;
while(D){J+=D.offsetTop;
E+=D.offsetLeft;
D=D.offsetParent;
}if(E<=L&&J<=K&&(L-E)<A.offsetWidth&&(K-J)<A.offsetHeight){return SimileAjax.DOM._hittest(A,L,K,H);
}else{if(A.nodeType==1&&A.tagName=="TR"){var I=SimileAjax.DOM._hittest(A,L,K,H);
if(I!=A){return I;
}}}}}return C;
};
SimileAjax.DOM.cancelEvent=function(A){A.returnValue=false;
A.cancelBubble=true;
if("preventDefault" in A){A.preventDefault();
}};
SimileAjax.DOM.appendClassName=function(C,D){var B=C.className.split(" ");
for(var A=0;
A<B.length;
A++){if(B[A]==D){return ;
}}B.push(D);
C.className=B.join(" ");
};
SimileAjax.DOM.createInputElement=function(A){var B=document.createElement("div");
B.innerHTML="<input type='"+A+"' />";
return B.firstChild;
};
SimileAjax.DOM.createDOMFromTemplate=function(B){var A={};
A.elmt=SimileAjax.DOM._createDOMFromTemplate(B,A,null);
return A;
};
SimileAjax.DOM._createDOMFromTemplate=function(A,I,E){if(A==null){return null;
}else{if(typeof A!="object"){var D=document.createTextNode(A);
if(E!=null){E.appendChild(D);
}return D;
}else{var C=null;
if("tag" in A){var J=A.tag;
if(E!=null){if(J=="tr"){C=E.insertRow(E.rows.length);
}else{if(J=="td"){C=E.insertCell(E.cells.length);
}}}if(C==null){C=J=="input"?SimileAjax.DOM.createInputElement(A.type):document.createElement(J);
if(E!=null){E.appendChild(C);
}}}else{C=A.elmt;
if(E!=null){E.appendChild(C);
}}for(var B in A){var G=A[B];
if(B=="field"){I[G]=C;
}else{if(B=="className"){C.className=G;
}else{if(B=="id"){C.id=G;
}else{if(B=="title"){C.title=G;
}else{if(B=="type"&&C.tagName=="input"){}else{if(B=="style"){for(n in G){var H=G[n];
if(n=="float"){n=SimileAjax.Platform.browser.isIE?"styleFloat":"cssFloat";
}C.style[n]=H;
}}else{if(B=="children"){for(var F=0;
F<G.length;
F++){SimileAjax.DOM._createDOMFromTemplate(G[F],I,C);
}}else{if(B!="tag"&&B!="elmt"){C.setAttribute(B,G);
}}}}}}}}}return C;
}}};
SimileAjax.DOM._cachedParent=null;
SimileAjax.DOM.createElementFromString=function(A){if(SimileAjax.DOM._cachedParent==null){SimileAjax.DOM._cachedParent=document.createElement("div");
}SimileAjax.DOM._cachedParent.innerHTML=A;
return SimileAjax.DOM._cachedParent.firstChild;
};
SimileAjax.DOM.createDOMFromString=function(A,C,D){var B=typeof A=="string"?document.createElement(A):A;
B.innerHTML=C;
var E={elmt:B};
SimileAjax.DOM._processDOMChildrenConstructedFromString(E,B,D!=null?D:{});
return E;
};
SimileAjax.DOM._processDOMConstructedFromString=function(D,A,B){var E=A.id;
if(E!=null&&E.length>0){A.removeAttribute("id");
if(E in B){var C=A.parentNode;
C.insertBefore(B[E],A);
C.removeChild(A);
D[E]=B[E];
return ;
}else{D[E]=A;
}}if(A.hasChildNodes()){SimileAjax.DOM._processDOMChildrenConstructedFromString(D,A,B);
}};
SimileAjax.DOM._processDOMChildrenConstructedFromString=function(E,B,D){var C=B.firstChild;
while(C!=null){var A=C.nextSibling;
if(C.nodeType==1){SimileAjax.DOM._processDOMConstructedFromString(E,C,D);
}C=A;
}};


/* graphics.js */
SimileAjax.Graphics=new Object();
SimileAjax.Graphics.pngIsTranslucent=(!SimileAjax.Platform.browser.isIE)||(SimileAjax.Platform.browser.majorVersion>6);
SimileAjax.Graphics._createTranslucentImage1=function(A,C){var B=document.createElement("img");
B.setAttribute("src",A);
if(C!=null){B.style.verticalAlign=C;
}return B;
};
SimileAjax.Graphics._createTranslucentImage2=function(A,C){var B=document.createElement("img");
B.style.width="1px";
B.style.height="1px";
B.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+A+"', sizingMethod='image')";
B.style.verticalAlign=(C!=null)?C:"middle";
return B;
};
SimileAjax.Graphics.createTranslucentImage=SimileAjax.Graphics.pngIsTranslucent?SimileAjax.Graphics._createTranslucentImage1:SimileAjax.Graphics._createTranslucentImage2;
SimileAjax.Graphics._createTranslucentImageHTML1=function(A,B){return'<img src="'+A+'"'+(B!=null?' style="vertical-align: '+B+';"':"")+" />";
};
SimileAjax.Graphics._createTranslucentImageHTML2=function(A,C){var B="width: 1px; height: 1px; filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+A+"', sizingMethod='image');"+(C!=null?" vertical-align: "+C+";":"");
return"<img src='"+A+"' style=\""+B+'" />';
};
SimileAjax.Graphics.createTranslucentImageHTML=SimileAjax.Graphics.pngIsTranslucent?SimileAjax.Graphics._createTranslucentImageHTML1:SimileAjax.Graphics._createTranslucentImageHTML2;
SimileAjax.Graphics.setOpacity=function(B,A){if(SimileAjax.Platform.browser.isIE){B.style.filter="progid:DXImageTransform.Microsoft.Alpha(Style=0,Opacity="+A+")";
}else{var C=(A/100).toString();
B.style.opacity=C;
B.style.MozOpacity=C;
}};
SimileAjax.Graphics._bubbleMargins={top:33,bottom:42,left:33,right:40};
SimileAjax.Graphics._arrowOffsets={top:0,bottom:9,left:1,right:8};
SimileAjax.Graphics._bubblePadding=15;
SimileAjax.Graphics._bubblePointOffset=6;
SimileAjax.Graphics._halfArrowWidth=18;
SimileAjax.Graphics.createBubbleForContentAndPoint=function(E,D,C,A,B){if(typeof A!="number"){A=300;
}E.style.position="absolute";
E.style.left="-5000px";
E.style.top="0px";
E.style.width=A+"px";
document.body.appendChild(E);
window.setTimeout(function(){var H=E.scrollWidth+10;
var F=E.scrollHeight+10;
var G=SimileAjax.Graphics.createBubbleForPoint(D,C,H,F,B);
document.body.removeChild(E);
E.style.position="static";
E.style.left="";
E.style.top="";
E.style.width=H+"px";
G.content.appendChild(E);
},200);
};
SimileAjax.Graphics.createBubbleForPoint=function(C,B,N,R,F){function T(){if(typeof window.innerHeight=="number"){return{w:window.innerWidth,h:window.innerHeight};
}else{if(document.documentElement&&document.documentElement.clientHeight){return{w:document.documentElement.clientWidth,h:document.documentElement.clientHeight};
}else{if(document.body&&document.body.clientHeight){return{w:document.body.clientWidth,h:document.body.clientHeight};
}}}}var L=function(){if(!M._closed){document.body.removeChild(M._div);
M._doc=null;
M._div=null;
M._content=null;
M._closed=true;
}};
var M={_closed:false};
var O=T();
var H=O.w;
var G=O.h;
var D=SimileAjax.Graphics._bubbleMargins;
N=parseInt(N,10);
R=parseInt(R,10);
var P=D.left+N+D.right;
var U=D.top+R+D.bottom;
var Q=SimileAjax.Graphics.pngIsTranslucent;
var J=SimileAjax.urlPrefix;
var A=function(Z,Y,a,X){Z.style.position="absolute";
Z.style.width=a+"px";
Z.style.height=X+"px";
if(Q){Z.style.background="url("+Y+")";
}else{Z.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+Y+"', sizingMethod='crop')";
}};
var K=document.createElement("div");
K.style.width=P+"px";
K.style.height=U+"px";
K.style.position="absolute";
K.style.zIndex=1000;
var W=SimileAjax.WindowManager.pushLayer(L,true,K);
M._div=K;
M.close=function(){SimileAjax.WindowManager.popLayer(W);
};
var I=document.createElement("div");
I.style.width="100%";
I.style.height="100%";
I.style.position="relative";
K.appendChild(I);
var S=function(Z,c,b,a,Y){var X=document.createElement("div");
X.style.left=c+"px";
X.style.top=b+"px";
A(X,Z,a,Y);
I.appendChild(X);
};
S(J+"images/bubble-top-left.png",0,0,D.left,D.top);
S(J+"images/bubble-top.png",D.left,0,N,D.top);
S(J+"images/bubble-top-right.png",D.left+N,0,D.right,D.top);
S(J+"images/bubble-left.png",0,D.top,D.left,R);
S(J+"images/bubble-right.png",D.left+N,D.top,D.right,R);
S(J+"images/bubble-bottom-left.png",0,D.top+R,D.left,D.bottom);
S(J+"images/bubble-bottom.png",D.left,D.top+R,N,D.bottom);
S(J+"images/bubble-bottom-right.png",D.left+N,D.top+R,D.right,D.bottom);
var V=document.createElement("div");
V.style.left=(P-D.right+SimileAjax.Graphics._bubblePadding-16-2)+"px";
V.style.top=(D.top-SimileAjax.Graphics._bubblePadding+1)+"px";
V.style.cursor="pointer";
A(V,J+"images/close-button.png",16,16);
SimileAjax.WindowManager.registerEventWithObject(V,"click",M,"close");
I.appendChild(V);
var E=document.createElement("div");
E.style.position="absolute";
E.style.left=D.left+"px";
E.style.top=D.top+"px";
E.style.width=N+"px";
E.style.height=R+"px";
E.style.overflow="auto";
E.style.background="white";
I.appendChild(E);
M.content=E;
(function(){if(C-SimileAjax.Graphics._halfArrowWidth-SimileAjax.Graphics._bubblePadding>0&&C+SimileAjax.Graphics._halfArrowWidth+SimileAjax.Graphics._bubblePadding<H){var Z=C-Math.round(N/2)-D.left;
Z=C<(H/2)?Math.max(Z,-(D.left-SimileAjax.Graphics._bubblePadding)):Math.min(Z,H+(D.right-SimileAjax.Graphics._bubblePadding)-P);
if((F&&F=="top")||(!F&&(B-SimileAjax.Graphics._bubblePointOffset-U>0))){var X=document.createElement("div");
X.style.left=(C-SimileAjax.Graphics._halfArrowWidth-Z)+"px";
X.style.top=(D.top+R)+"px";
A(X,J+"images/bubble-bottom-arrow.png",37,D.bottom);
I.appendChild(X);
K.style.left=Z+"px";
K.style.top=(B-SimileAjax.Graphics._bubblePointOffset-U+SimileAjax.Graphics._arrowOffsets.bottom)+"px";
return ;
}else{if((F&&F=="bottom")||(!F&&(B+SimileAjax.Graphics._bubblePointOffset+U<G))){var X=document.createElement("div");
X.style.left=(C-SimileAjax.Graphics._halfArrowWidth-Z)+"px";
X.style.top="0px";
A(X,J+"images/bubble-top-arrow.png",37,D.top);
I.appendChild(X);
K.style.left=Z+"px";
K.style.top=(B+SimileAjax.Graphics._bubblePointOffset-SimileAjax.Graphics._arrowOffsets.top)+"px";
return ;
}}}var Y=B-Math.round(R/2)-D.top;
Y=B<(G/2)?Math.max(Y,-(D.top-SimileAjax.Graphics._bubblePadding)):Math.min(Y,G+(D.bottom-SimileAjax.Graphics._bubblePadding)-U);
if((F&&F=="left")||(!F&&(C-SimileAjax.Graphics._bubblePointOffset-P>0))){var X=document.createElement("div");
X.style.left=(D.left+N)+"px";
X.style.top=(B-SimileAjax.Graphics._halfArrowWidth-Y)+"px";
A(X,J+"images/bubble-right-arrow.png",D.right,37);
I.appendChild(X);
K.style.left=(C-SimileAjax.Graphics._bubblePointOffset-P+SimileAjax.Graphics._arrowOffsets.right)+"px";
K.style.top=Y+"px";
}else{if((F&&F=="right")||(!F&&(C-SimileAjax.Graphics._bubblePointOffset-P<H))){var X=document.createElement("div");
X.style.left="0px";
X.style.top=(B-SimileAjax.Graphics._halfArrowWidth-Y)+"px";
A(X,J+"images/bubble-left-arrow.png",D.left,37);
I.appendChild(X);
K.style.left=(C+SimileAjax.Graphics._bubblePointOffset-SimileAjax.Graphics._arrowOffsets.left)+"px";
K.style.top=Y+"px";
}}})();
document.body.appendChild(K);
return M;
};
SimileAjax.Graphics.createMessageBubble=function(H){var G=H.createElement("div");
if(SimileAjax.Graphics.pngIsTranslucent){var I=H.createElement("div");
I.style.height="33px";
I.style.background="url("+SimileAjax.urlPrefix+"images/message-top-left.png) top left no-repeat";
I.style.paddingLeft="44px";
G.appendChild(I);
var C=H.createElement("div");
C.style.height="33px";
C.style.background="url("+SimileAjax.urlPrefix+"images/message-top-right.png) top right no-repeat";
I.appendChild(C);
var F=H.createElement("div");
F.style.background="url("+SimileAjax.urlPrefix+"images/message-left.png) top left repeat-y";
F.style.paddingLeft="44px";
G.appendChild(F);
var A=H.createElement("div");
A.style.background="url("+SimileAjax.urlPrefix+"images/message-right.png) top right repeat-y";
A.style.paddingRight="44px";
F.appendChild(A);
var D=H.createElement("div");
A.appendChild(D);
var B=H.createElement("div");
B.style.height="55px";
B.style.background="url("+SimileAjax.urlPrefix+"images/message-bottom-left.png) bottom left no-repeat";
B.style.paddingLeft="44px";
G.appendChild(B);
var E=H.createElement("div");
E.style.height="55px";
E.style.background="url("+SimileAjax.urlPrefix+"images/message-bottom-right.png) bottom right no-repeat";
B.appendChild(E);
}else{G.style.border="2px solid #7777AA";
G.style.padding="20px";
G.style.background="white";
SimileAjax.Graphics.setOpacity(G,90);
var D=H.createElement("div");
G.appendChild(D);
}return{containerDiv:G,contentDiv:D};
};
SimileAjax.Graphics.createAnimation=function(B,E,D,C,A){return new SimileAjax.Graphics._Animation(B,E,D,C,A);
};
SimileAjax.Graphics._Animation=function(B,E,D,C,A){this.f=B;
this.cont=(typeof A=="function")?A:function(){};
this.from=E;
this.to=D;
this.current=E;
this.duration=C;
this.start=new Date().getTime();
this.timePassed=0;
};
SimileAjax.Graphics._Animation.prototype.run=function(){var A=this;
window.setTimeout(function(){A.step();
},50);
};
SimileAjax.Graphics._Animation.prototype.step=function(){this.timePassed+=50;
var B=this.timePassed/this.duration;
var A=-Math.cos(B*Math.PI)/2+0.5;
var D=A*(this.to-this.from)+this.from;
try{this.f(D,D-this.current);
}catch(C){}this.current=D;
if(this.timePassed<this.duration){this.run();
}else{this.f(this.to,0);
this["cont"]();
}};
SimileAjax.Graphics.createStructuredDataCopyButton=function(F,D,A,E){var G=document.createElement("div");
G.style.position="relative";
G.style.display="inline";
G.style.width=D+"px";
G.style.height=A+"px";
G.style.overflow="hidden";
G.style.margin="2px";
if(SimileAjax.Graphics.pngIsTranslucent){G.style.background="url("+F+") no-repeat";
}else{G.style.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+F+"', sizingMethod='image')";
}var C;
if(SimileAjax.Platform.browser.isIE){C="filter:alpha(opacity=0)";
}else{C="opacity: 0";
}G.innerHTML="<textarea rows='1' autocomplete='off' value='none' style='"+C+"' />";
var B=G.firstChild;
B.style.width=D+"px";
B.style.height=A+"px";
B.onmousedown=function(H){H=(H)?H:((event)?event:null);
if(H.button==2){B.value=E();
B.select();
}};
return G;
};
SimileAjax.Graphics.getFontRenderingContext=function(A,B){return new SimileAjax.Graphics._FontRenderingContext(A,B);
};
SimileAjax.Graphics._FontRenderingContext=function(A,B){this._elmt=A;
this._elmt.style.visibility="hidden";
if(typeof B=="string"){this._elmt.style.width=B;
}else{if(typeof B=="number"){this._elmt.style.width=B+"px";
}}};
SimileAjax.Graphics._FontRenderingContext.prototype.dispose=function(){this._elmt=null;
};
SimileAjax.Graphics._FontRenderingContext.prototype.update=function(){this._elmt.innerHTML="A";
this._lineHeight=this._elmt.offsetHeight;
};
SimileAjax.Graphics._FontRenderingContext.prototype.computeSize=function(A){this._elmt.innerHTML=A;
return{width:this._elmt.offsetWidth,height:this._elmt.offsetHeight};
};
SimileAjax.Graphics._FontRenderingContext.prototype.getLineHeight=function(){return this._lineHeight;
};


/* history.js */
SimileAjax.History={maxHistoryLength:10,historyFile:"__history__.html",enabled:true,_initialized:false,_listeners:new SimileAjax.ListenerQueue(),_actions:[],_baseIndex:0,_currentIndex:0,_plainDocumentTitle:document.title};
SimileAjax.History.formatHistoryEntryTitle=function(A){return SimileAjax.History._plainDocumentTitle+" {"+A+"}";
};
SimileAjax.History.initialize=function(){if(SimileAjax.History._initialized){return ;
}if(SimileAjax.History.enabled){var A=document.createElement("iframe");
A.id="simile-ajax-history";
A.style.position="absolute";
A.style.width="10px";
A.style.height="10px";
A.style.top="0px";
A.style.left="0px";
A.style.visibility="hidden";
A.src=SimileAjax.History.historyFile+"?0";
document.body.appendChild(A);
SimileAjax.DOM.registerEvent(A,"load",SimileAjax.History._handleIFrameOnLoad);
SimileAjax.History._iframe=A;
}SimileAjax.History._initialized=true;
};
SimileAjax.History.addListener=function(A){SimileAjax.History.initialize();
SimileAjax.History._listeners.add(A);
};
SimileAjax.History.removeListener=function(A){SimileAjax.History.initialize();
SimileAjax.History._listeners.remove(A);
};
SimileAjax.History.addAction=function(A){SimileAjax.History.initialize();
SimileAjax.History._listeners.fire("onBeforePerform",[A]);
window.setTimeout(function(){try{A.perform();
SimileAjax.History._listeners.fire("onAfterPerform",[A]);
if(SimileAjax.History.enabled){SimileAjax.History._actions=SimileAjax.History._actions.slice(0,SimileAjax.History._currentIndex-SimileAjax.History._baseIndex);
SimileAjax.History._actions.push(A);
SimileAjax.History._currentIndex++;
var C=SimileAjax.History._actions.length-SimileAjax.History.maxHistoryLength;
if(C>0){SimileAjax.History._actions=SimileAjax.History._actions.slice(C);
SimileAjax.History._baseIndex+=C;
}try{SimileAjax.History._iframe.contentWindow.location.search="?"+SimileAjax.History._currentIndex;
}catch(B){var D=SimileAjax.History.formatHistoryEntryTitle(A.label);
document.title=D;
}}}catch(B){SimileAjax.Debug.exception(B,"Error adding action {"+A.label+"} to history");
}},0);
};
SimileAjax.History.addLengthyAction=function(C,A,B){SimileAjax.History.addAction({perform:C,undo:A,label:B,uiLayer:SimileAjax.WindowManager.getBaseLayer(),lengthy:true});
};
SimileAjax.History._handleIFrameOnLoad=function(){try{var B=SimileAjax.History._iframe.contentWindow.location.search;
var F=(B.length==0)?0:Math.max(0,parseInt(B.substr(1)));
var E=function(){var G=F-SimileAjax.History._currentIndex;
SimileAjax.History._currentIndex+=G;
SimileAjax.History._baseIndex+=G;
SimileAjax.History._iframe.contentWindow.location.search="?"+F;
};
if(F<SimileAjax.History._currentIndex){SimileAjax.History._listeners.fire("onBeforeUndoSeveral",[]);
window.setTimeout(function(){while(SimileAjax.History._currentIndex>F&&SimileAjax.History._currentIndex>SimileAjax.History._baseIndex){SimileAjax.History._currentIndex--;
var G=SimileAjax.History._actions[SimileAjax.History._currentIndex-SimileAjax.History._baseIndex];
try{G.undo();
}catch(H){SimileAjax.Debug.exception(H,"History: Failed to undo action {"+G.label+"}");
}}SimileAjax.History._listeners.fire("onAfterUndoSeveral",[]);
E();
},0);
}else{if(F>SimileAjax.History._currentIndex){SimileAjax.History._listeners.fire("onBeforeRedoSeveral",[]);
window.setTimeout(function(){while(SimileAjax.History._currentIndex<F&&SimileAjax.History._currentIndex-SimileAjax.History._baseIndex<SimileAjax.History._actions.length){var G=SimileAjax.History._actions[SimileAjax.History._currentIndex-SimileAjax.History._baseIndex];
try{G.perform();
}catch(H){SimileAjax.Debug.exception(H,"History: Failed to redo action {"+G.label+"}");
}SimileAjax.History._currentIndex++;
}SimileAjax.History._listeners.fire("onAfterRedoSeveral",[]);
E();
},0);
}else{var A=SimileAjax.History._currentIndex-SimileAjax.History._baseIndex-1;
var D=(A>=0&&A<SimileAjax.History._actions.length)?SimileAjax.History.formatHistoryEntryTitle(SimileAjax.History._actions[A].label):SimileAjax.History._plainDocumentTitle;
SimileAjax.History._iframe.contentWindow.document.title=D;
document.title=D;
}}}catch(C){}};
SimileAjax.History.getNextUndoAction=function(){try{var A=SimileAjax.History._currentIndex-SimileAjax.History._baseIndex-1;
return SimileAjax.History._actions[A];
}catch(B){return null;
}};
SimileAjax.History.getNextRedoAction=function(){try{var A=SimileAjax.History._currentIndex-SimileAjax.History._baseIndex;
return SimileAjax.History._actions[A];
}catch(B){return null;
}};


/* html.js */
SimileAjax.HTML=new Object();
SimileAjax.HTML._e2uHash={};
(function(){var A=SimileAjax.HTML._e2uHash;
A["nbsp"]="\u00A0[space]";
A["iexcl"]="\u00A1";
A["cent"]="\u00A2";
A["pound"]="\u00A3";
A["curren"]="\u00A4";
A["yen"]="\u00A5";
A["brvbar"]="\u00A6";
A["sect"]="\u00A7";
A["uml"]="\u00A8";
A["copy"]="\u00A9";
A["ordf"]="\u00AA";
A["laquo"]="\u00AB";
A["not"]="\u00AC";
A["shy"]="\u00AD";
A["reg"]="\u00AE";
A["macr"]="\u00AF";
A["deg"]="\u00B0";
A["plusmn"]="\u00B1";
A["sup2"]="\u00B2";
A["sup3"]="\u00B3";
A["acute"]="\u00B4";
A["micro"]="\u00B5";
A["para"]="\u00B6";
A["middot"]="\u00B7";
A["cedil"]="\u00B8";
A["sup1"]="\u00B9";
A["ordm"]="\u00BA";
A["raquo"]="\u00BB";
A["frac14"]="\u00BC";
A["frac12"]="\u00BD";
A["frac34"]="\u00BE";
A["iquest"]="\u00BF";
A["Agrave"]="\u00C0";
A["Aacute"]="\u00C1";
A["Acirc"]="\u00C2";
A["Atilde"]="\u00C3";
A["Auml"]="\u00C4";
A["Aring"]="\u00C5";
A["AElig"]="\u00C6";
A["Ccedil"]="\u00C7";
A["Egrave"]="\u00C8";
A["Eacute"]="\u00C9";
A["Ecirc"]="\u00CA";
A["Euml"]="\u00CB";
A["Igrave"]="\u00CC";
A["Iacute"]="\u00CD";
A["Icirc"]="\u00CE";
A["Iuml"]="\u00CF";
A["ETH"]="\u00D0";
A["Ntilde"]="\u00D1";
A["Ograve"]="\u00D2";
A["Oacute"]="\u00D3";
A["Ocirc"]="\u00D4";
A["Otilde"]="\u00D5";
A["Ouml"]="\u00D6";
A["times"]="\u00D7";
A["Oslash"]="\u00D8";
A["Ugrave"]="\u00D9";
A["Uacute"]="\u00DA";
A["Ucirc"]="\u00DB";
A["Uuml"]="\u00DC";
A["Yacute"]="\u00DD";
A["THORN"]="\u00DE";
A["szlig"]="\u00DF";
A["agrave"]="\u00E0";
A["aacute"]="\u00E1";
A["acirc"]="\u00E2";
A["atilde"]="\u00E3";
A["auml"]="\u00E4";
A["aring"]="\u00E5";
A["aelig"]="\u00E6";
A["ccedil"]="\u00E7";
A["egrave"]="\u00E8";
A["eacute"]="\u00E9";
A["ecirc"]="\u00EA";
A["euml"]="\u00EB";
A["igrave"]="\u00EC";
A["iacute"]="\u00ED";
A["icirc"]="\u00EE";
A["iuml"]="\u00EF";
A["eth"]="\u00F0";
A["ntilde"]="\u00F1";
A["ograve"]="\u00F2";
A["oacute"]="\u00F3";
A["ocirc"]="\u00F4";
A["otilde"]="\u00F5";
A["ouml"]="\u00F6";
A["divide"]="\u00F7";
A["oslash"]="\u00F8";
A["ugrave"]="\u00F9";
A["uacute"]="\u00FA";
A["ucirc"]="\u00FB";
A["uuml"]="\u00FC";
A["yacute"]="\u00FD";
A["thorn"]="\u00FE";
A["yuml"]="\u00FF";
A["quot"]="\u0022";
A["amp"]="\u0026";
A["lt"]="\u003C";
A["gt"]="\u003E";
A["OElig"]="";
A["oelig"]="\u0153";
A["Scaron"]="\u0160";
A["scaron"]="\u0161";
A["Yuml"]="\u0178";
A["circ"]="\u02C6";
A["tilde"]="\u02DC";
A["ensp"]="\u2002";
A["emsp"]="\u2003";
A["thinsp"]="\u2009";
A["zwnj"]="\u200C";
A["zwj"]="\u200D";
A["lrm"]="\u200E";
A["rlm"]="\u200F";
A["ndash"]="\u2013";
A["mdash"]="\u2014";
A["lsquo"]="\u2018";
A["rsquo"]="\u2019";
A["sbquo"]="\u201A";
A["ldquo"]="\u201C";
A["rdquo"]="\u201D";
A["bdquo"]="\u201E";
A["dagger"]="\u2020";
A["Dagger"]="\u2021";
A["permil"]="\u2030";
A["lsaquo"]="\u2039";
A["rsaquo"]="\u203A";
A["euro"]="\u20AC";
A["fnof"]="\u0192";
A["Alpha"]="\u0391";
A["Beta"]="\u0392";
A["Gamma"]="\u0393";
A["Delta"]="\u0394";
A["Epsilon"]="\u0395";
A["Zeta"]="\u0396";
A["Eta"]="\u0397";
A["Theta"]="\u0398";
A["Iota"]="\u0399";
A["Kappa"]="\u039A";
A["Lambda"]="\u039B";
A["Mu"]="\u039C";
A["Nu"]="\u039D";
A["Xi"]="\u039E";
A["Omicron"]="\u039F";
A["Pi"]="\u03A0";
A["Rho"]="\u03A1";
A["Sigma"]="\u03A3";
A["Tau"]="\u03A4";
A["Upsilon"]="\u03A5";
A["Phi"]="\u03A6";
A["Chi"]="\u03A7";
A["Psi"]="\u03A8";
A["Omega"]="\u03A9";
A["alpha"]="\u03B1";
A["beta"]="\u03B2";
A["gamma"]="\u03B3";
A["delta"]="\u03B4";
A["epsilon"]="\u03B5";
A["zeta"]="\u03B6";
A["eta"]="\u03B7";
A["theta"]="\u03B8";
A["iota"]="\u03B9";
A["kappa"]="\u03BA";
A["lambda"]="\u03BB";
A["mu"]="\u03BC";
A["nu"]="\u03BD";
A["xi"]="\u03BE";
A["omicron"]="\u03BF";
A["pi"]="\u03C0";
A["rho"]="\u03C1";
A["sigmaf"]="\u03C2";
A["sigma"]="\u03C3";
A["tau"]="\u03C4";
A["upsilon"]="\u03C5";
A["phi"]="\u03C6";
A["chi"]="\u03C7";
A["psi"]="\u03C8";
A["omega"]="\u03C9";
A["thetasym"]="\u03D1";
A["upsih"]="\u03D2";
A["piv"]="\u03D6";
A["bull"]="\u2022";
A["hellip"]="\u2026";
A["prime"]="\u2032";
A["Prime"]="\u2033";
A["oline"]="\u203E";
A["frasl"]="\u2044";
A["weierp"]="\u2118";
A["image"]="\u2111";
A["real"]="\u211C";
A["trade"]="\u2122";
A["alefsym"]="\u2135";
A["larr"]="\u2190";
A["uarr"]="\u2191";
A["rarr"]="\u2192";
A["darr"]="\u2193";
A["harr"]="\u2194";
A["crarr"]="\u21B5";
A["lArr"]="\u21D0";
A["uArr"]="\u21D1";
A["rArr"]="\u21D2";
A["dArr"]="\u21D3";
A["hArr"]="\u21D4";
A["forall"]="\u2200";
A["part"]="\u2202";
A["exist"]="\u2203";
A["empty"]="\u2205";
A["nabla"]="\u2207";
A["isin"]="\u2208";
A["notin"]="\u2209";
A["ni"]="\u220B";
A["prod"]="\u220F";
A["sum"]="\u2211";
A["minus"]="\u2212";
A["lowast"]="\u2217";
A["radic"]="\u221A";
A["prop"]="\u221D";
A["infin"]="\u221E";
A["ang"]="\u2220";
A["and"]="\u2227";
A["or"]="\u2228";
A["cap"]="\u2229";
A["cup"]="\u222A";
A["int"]="\u222B";
A["there4"]="\u2234";
A["sim"]="\u223C";
A["cong"]="\u2245";
A["asymp"]="\u2248";
A["ne"]="\u2260";
A["equiv"]="\u2261";
A["le"]="\u2264";
A["ge"]="\u2265";
A["sub"]="\u2282";
A["sup"]="\u2283";
A["nsub"]="\u2284";
A["sube"]="\u2286";
A["supe"]="\u2287";
A["oplus"]="\u2295";
A["otimes"]="\u2297";
A["perp"]="\u22A5";
A["sdot"]="\u22C5";
A["lceil"]="\u2308";
A["rceil"]="\u2309";
A["lfloor"]="\u230A";
A["rfloor"]="\u230B";
A["lang"]="\u2329";
A["rang"]="\u232A";
A["loz"]="\u25CA";
A["spades"]="\u2660";
A["clubs"]="\u2663";
A["hearts"]="\u2665";
A["diams"]="\u2666";
})();
SimileAjax.HTML.deEntify=function(C){var D=SimileAjax.HTML._e2uHash;
var B=/&(\w+?);/;
while(B.test(C)){var A=C.match(B);
C=C.replace(B,D[A[1]]);
}return C;
};


/* json.js */
SimileAjax.JSON=new Object();
(function(){var m={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"};
var s={array:function(x){var a=["["],b,f,i,l=x.length,v;
for(i=0;
i<l;
i+=1){v=x[i];
f=s[typeof v];
if(f){v=f(v);
if(typeof v=="string"){if(b){a[a.length]=",";
}a[a.length]=v;
b=true;
}}}a[a.length]="]";
return a.join("");
},"boolean":function(x){return String(x);
},"null":function(x){return"null";
},number:function(x){return isFinite(x)?String(x):"null";
},object:function(x){if(x){if(x instanceof Array){return s.array(x);
}var a=["{"],b,f,i,v;
for(i in x){v=x[i];
f=s[typeof v];
if(f){v=f(v);
if(typeof v=="string"){if(b){a[a.length]=",";
}a.push(s.string(i),":",v);
b=true;
}}}a[a.length]="}";
return a.join("");
}return"null";
},string:function(x){if(/["\\\x00-\x1f]/.test(x)){x=x.replace(/([\x00-\x1f\\"])/g,function(a,b){var c=m[b];
if(c){return c;
}c=b.charCodeAt();
return"\\u00"+Math.floor(c/16).toString(16)+(c%16).toString(16);
});
}return'"'+x+'"';
}};
SimileAjax.JSON.toJSONString=function(o){if(o instanceof Object){return s.object(o);
}else{if(o instanceof Array){return s.array(o);
}else{return o.toString();
}}};
SimileAjax.JSON.parseJSON=function(){try{return !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(this.replace(/"(\\.|[^"\\])*"/g,"")))&&eval("("+this+")");
}catch(e){return false;
}};
})();


/* string.js */
String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g,"");
};
String.prototype.startsWith=function(A){return this.length>=A.length&&this.substr(0,A.length)==A;
};
String.prototype.endsWith=function(A){return this.length>=A.length&&this.substr(this.length-A.length)==A;
};
String.substitute=function(B,D){var A="";
var F=0;
while(F<B.length-1){var C=B.indexOf("%",F);
if(C<0||C==B.length-1){break;
}else{if(C>F&&B.charAt(C-1)=="\\"){A+=B.substring(F,C-1)+"%";
F=C+1;
}else{var E=parseInt(B.charAt(C+1));
if(isNaN(E)||E>=D.length){A+=B.substring(F,C+2);
}else{A+=B.substring(F,C)+D[E].toString();
}F=C+2;
}}}if(F<B.length){A+=B.substring(F);
}return A;
};


/* units.js */
SimileAjax.NativeDateUnit=new Object();
SimileAjax.NativeDateUnit.makeDefaultValue=function(){return new Date();
};
SimileAjax.NativeDateUnit.cloneValue=function(A){return new Date(A.getTime());
};
SimileAjax.NativeDateUnit.getParser=function(A){if(typeof A=="string"){A=A.toLowerCase();
}return(A=="iso8601"||A=="iso 8601")?SimileAjax.DateTime.parseIso8601DateTime:SimileAjax.DateTime.parseGregorianDateTime;
};
SimileAjax.NativeDateUnit.parseFromObject=function(A){return SimileAjax.DateTime.parseGregorianDateTime(A);
};
SimileAjax.NativeDateUnit.toNumber=function(A){return A.getTime();
};
SimileAjax.NativeDateUnit.fromNumber=function(A){return new Date(A);
};
SimileAjax.NativeDateUnit.compare=function(D,C){var B,A;
if(typeof D=="object"){B=D.getTime();
}else{B=Number(D);
}if(typeof C=="object"){A=C.getTime();
}else{A=Number(C);
}return B-A;
};
SimileAjax.NativeDateUnit.earlier=function(B,A){return SimileAjax.NativeDateUnit.compare(B,A)<0?B:A;
};
SimileAjax.NativeDateUnit.later=function(B,A){return SimileAjax.NativeDateUnit.compare(B,A)>0?B:A;
};
SimileAjax.NativeDateUnit.change=function(A,B){return new Date(A.getTime()+B);
};


/* window-manager.js */
SimileAjax.WindowManager={_initialized:false,_listeners:[],_draggedElement:null,_draggedElementCallback:null,_dropTargetHighlightElement:null,_lastCoords:null,_ghostCoords:null,_draggingMode:"",_dragging:false,_layers:[]};
SimileAjax.WindowManager.initialize=function(){if(SimileAjax.WindowManager._initialized){return ;
}SimileAjax.DOM.registerEvent(document.body,"mousedown",SimileAjax.WindowManager._onBodyMouseDown);
SimileAjax.DOM.registerEvent(document.body,"mousemove",SimileAjax.WindowManager._onBodyMouseMove);
SimileAjax.DOM.registerEvent(document.body,"mouseup",SimileAjax.WindowManager._onBodyMouseUp);
SimileAjax.DOM.registerEvent(document,"keydown",SimileAjax.WindowManager._onBodyKeyDown);
SimileAjax.DOM.registerEvent(document,"keyup",SimileAjax.WindowManager._onBodyKeyUp);
SimileAjax.WindowManager._layers.push({index:0});
SimileAjax.WindowManager._historyListener={onBeforeUndoSeveral:function(){},onAfterUndoSeveral:function(){},onBeforeUndo:function(){},onAfterUndo:function(){},onBeforeRedoSeveral:function(){},onAfterRedoSeveral:function(){},onBeforeRedo:function(){},onAfterRedo:function(){}};
SimileAjax.History.addListener(SimileAjax.WindowManager._historyListener);
SimileAjax.WindowManager._initialized=true;
};
SimileAjax.WindowManager.getBaseLayer=function(){SimileAjax.WindowManager.initialize();
return SimileAjax.WindowManager._layers[0];
};
SimileAjax.WindowManager.getHighestLayer=function(){SimileAjax.WindowManager.initialize();
return SimileAjax.WindowManager._layers[SimileAjax.WindowManager._layers.length-1];
};
SimileAjax.WindowManager.registerEventWithObject=function(D,A,E,B,C){SimileAjax.WindowManager.registerEvent(D,A,function(G,F,H){return E[B].call(E,G,F,H);
},C);
};
SimileAjax.WindowManager.registerEvent=function(D,B,E,C){if(C==null){C=SimileAjax.WindowManager.getHighestLayer();
}var A=function(G,F,I){if(SimileAjax.WindowManager._canProcessEventAtLayer(C)){SimileAjax.WindowManager._popToLayer(C.index);
try{E(G,F,I);
}catch(H){SimileAjax.Debug.exception(H);
}}SimileAjax.DOM.cancelEvent(F);
return false;
};
SimileAjax.DOM.registerEvent(D,B,A);
};
SimileAjax.WindowManager.pushLayer=function(C,D,B){var A={onPop:C,index:SimileAjax.WindowManager._layers.length,ephemeral:(D),elmt:B};
SimileAjax.WindowManager._layers.push(A);
return A;
};
SimileAjax.WindowManager.popLayer=function(B){for(var A=1;
A<SimileAjax.WindowManager._layers.length;
A++){if(SimileAjax.WindowManager._layers[A]==B){SimileAjax.WindowManager._popToLayer(A-1);
break;
}}};
SimileAjax.WindowManager.popAllLayers=function(){SimileAjax.WindowManager._popToLayer(0);
};
SimileAjax.WindowManager.registerForDragging=function(B,C,A){SimileAjax.WindowManager.registerEvent(B,"mousedown",function(E,D,F){SimileAjax.WindowManager._handleMouseDown(E,D,C);
},A);
};
SimileAjax.WindowManager._popToLayer=function(C){while(C+1<SimileAjax.WindowManager._layers.length){try{var A=SimileAjax.WindowManager._layers.pop();
if(A.onPop!=null){A.onPop();
}}catch(B){}}};
SimileAjax.WindowManager._canProcessEventAtLayer=function(B){if(B.index==(SimileAjax.WindowManager._layers.length-1)){return true;
}for(var A=B.index+1;
A<SimileAjax.WindowManager._layers.length;
A++){if(!SimileAjax.WindowManager._layers[A].ephemeral){return false;
}}return true;
};
SimileAjax.WindowManager.cancelPopups=function(A){var F=(A)?SimileAjax.DOM.getEventPageCoordinates(A):{x:-1,y:-1};
var E=SimileAjax.WindowManager._layers.length-1;
while(E>0&&SimileAjax.WindowManager._layers[E].ephemeral){var D=SimileAjax.WindowManager._layers[E];
if(D.elmt!=null){var C=D.elmt;
var B=SimileAjax.DOM.getPageCoordinates(C);
if(F.x>=B.left&&F.x<(B.left+C.offsetWidth)&&F.y>=B.top&&F.y<(B.top+C.offsetHeight)){break;
}}E--;
}SimileAjax.WindowManager._popToLayer(E);
};
SimileAjax.WindowManager._onBodyMouseDown=function(B,A,C){if(!("eventPhase" in A)||A.eventPhase==A.BUBBLING_PHASE){SimileAjax.WindowManager.cancelPopups(A);
}};
SimileAjax.WindowManager._handleMouseDown=function(B,A,C){SimileAjax.WindowManager._draggedElement=B;
SimileAjax.WindowManager._draggedElementCallback=C;
SimileAjax.WindowManager._lastCoords={x:A.clientX,y:A.clientY};
SimileAjax.DOM.cancelEvent(A);
return false;
};
SimileAjax.WindowManager._onBodyKeyDown=function(C,A,D){if(SimileAjax.WindowManager._dragging){if(A.keyCode==27){SimileAjax.WindowManager._cancelDragging();
}else{if((A.keyCode==17||A.keyCode==16)&&SimileAjax.WindowManager._draggingMode!="copy"){SimileAjax.WindowManager._draggingMode="copy";
var B=SimileAjax.Graphics.createTranslucentImage(SimileAjax.urlPrefix+"images/copy.png");
B.style.position="absolute";
B.style.left=(SimileAjax.WindowManager._ghostCoords.left-16)+"px";
B.style.top=(SimileAjax.WindowManager._ghostCoords.top)+"px";
document.body.appendChild(B);
SimileAjax.WindowManager._draggingModeIndicatorElmt=B;
}}}};
SimileAjax.WindowManager._onBodyKeyUp=function(B,A,C){if(SimileAjax.WindowManager._dragging){if(A.keyCode==17||A.keyCode==16){SimileAjax.WindowManager._draggingMode="";
if(SimileAjax.WindowManager._draggingModeIndicatorElmt!=null){document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
SimileAjax.WindowManager._draggingModeIndicatorElmt=null;
}}}};
SimileAjax.WindowManager._onBodyMouseMove=function(A,N,H){if(SimileAjax.WindowManager._draggedElement!=null){var P=SimileAjax.WindowManager._draggedElementCallback;
var E=SimileAjax.WindowManager._lastCoords;
var M=N.clientX-E.x;
var J=N.clientY-E.y;
if(!SimileAjax.WindowManager._dragging){if(Math.abs(M)>5||Math.abs(J)>5){try{if("onDragStart" in P){P.onDragStart();
}if("ghost" in P&&P.ghost){var K=SimileAjax.WindowManager._draggedElement;
SimileAjax.WindowManager._ghostCoords=SimileAjax.DOM.getPageCoordinates(K);
SimileAjax.WindowManager._ghostCoords.left+=M;
SimileAjax.WindowManager._ghostCoords.top+=J;
var O=K.cloneNode(true);
O.style.position="absolute";
O.style.left=SimileAjax.WindowManager._ghostCoords.left+"px";
O.style.top=SimileAjax.WindowManager._ghostCoords.top+"px";
O.style.zIndex=1000;
SimileAjax.Graphics.setOpacity(O,50);
document.body.appendChild(O);
P._ghostElmt=O;
}SimileAjax.WindowManager._dragging=true;
SimileAjax.WindowManager._lastCoords={x:N.clientX,y:N.clientY};
document.body.focus();
}catch(G){SimileAjax.Debug.exception("WindowManager: Error handling mouse down",G);
SimileAjax.WindowManager._cancelDragging();
}}}else{try{SimileAjax.WindowManager._lastCoords={x:N.clientX,y:N.clientY};
if("onDragBy" in P){P.onDragBy(M,J);
}if("_ghostElmt" in P){var O=P._ghostElmt;
SimileAjax.WindowManager._ghostCoords.left+=M;
SimileAjax.WindowManager._ghostCoords.top+=J;
O.style.left=SimileAjax.WindowManager._ghostCoords.left+"px";
O.style.top=SimileAjax.WindowManager._ghostCoords.top+"px";
if(SimileAjax.WindowManager._draggingModeIndicatorElmt!=null){var I=SimileAjax.WindowManager._draggingModeIndicatorElmt;
I.style.left=(SimileAjax.WindowManager._ghostCoords.left-16)+"px";
I.style.top=SimileAjax.WindowManager._ghostCoords.top+"px";
}if("droppable" in P&&P.droppable){var L=SimileAjax.DOM.getEventPageCoordinates(N);
var H=SimileAjax.DOM.hittest(L.x,L.y,[SimileAjax.WindowManager._ghostElmt,SimileAjax.WindowManager._dropTargetHighlightElement]);
H=SimileAjax.WindowManager._findDropTarget(H);
if(H!=SimileAjax.WindowManager._potentialDropTarget){if(SimileAjax.WindowManager._dropTargetHighlightElement!=null){document.body.removeChild(SimileAjax.WindowManager._dropTargetHighlightElement);
SimileAjax.WindowManager._dropTargetHighlightElement=null;
SimileAjax.WindowManager._potentialDropTarget=null;
}var F=false;
if(H!=null){if((!("canDropOn" in P)||P.canDropOn(H))&&(!("canDrop" in H)||H.canDrop(SimileAjax.WindowManager._draggedElement))){F=true;
}}if(F){var C=4;
var D=SimileAjax.DOM.getPageCoordinates(H);
var B=document.createElement("div");
B.style.border=C+"px solid yellow";
B.style.backgroundColor="yellow";
B.style.position="absolute";
B.style.left=D.left+"px";
B.style.top=D.top+"px";
B.style.width=(H.offsetWidth-C*2)+"px";
B.style.height=(H.offsetHeight-C*2)+"px";
SimileAjax.Graphics.setOpacity(B,30);
document.body.appendChild(B);
SimileAjax.WindowManager._potentialDropTarget=H;
SimileAjax.WindowManager._dropTargetHighlightElement=B;
}}}}}catch(G){SimileAjax.Debug.exception("WindowManager: Error handling mouse move",G);
SimileAjax.WindowManager._cancelDragging();
}}SimileAjax.DOM.cancelEvent(N);
return false;
}};
SimileAjax.WindowManager._onBodyMouseUp=function(B,A,C){if(SimileAjax.WindowManager._draggedElement!=null){try{if(SimileAjax.WindowManager._dragging){var E=SimileAjax.WindowManager._draggedElementCallback;
if("onDragEnd" in E){E.onDragEnd();
}if("droppable" in E&&E.droppable){var D=false;
var C=SimileAjax.WindowManager._potentialDropTarget;
if(C!=null){if((!("canDropOn" in E)||E.canDropOn(C))&&(!("canDrop" in C)||C.canDrop(SimileAjax.WindowManager._draggedElement))){if("onDropOn" in E){E.onDropOn(C);
}C.ondrop(SimileAjax.WindowManager._draggedElement,SimileAjax.WindowManager._draggingMode);
D=true;
}}if(!D){}}}}finally{SimileAjax.WindowManager._cancelDragging();
}SimileAjax.DOM.cancelEvent(A);
return false;
}};
SimileAjax.WindowManager._cancelDragging=function(){var B=SimileAjax.WindowManager._draggedElementCallback;
if("_ghostElmt" in B){var A=B._ghostElmt;
document.body.removeChild(A);
delete B._ghostElmt;
}if(SimileAjax.WindowManager._dropTargetHighlightElement!=null){document.body.removeChild(SimileAjax.WindowManager._dropTargetHighlightElement);
SimileAjax.WindowManager._dropTargetHighlightElement=null;
}if(SimileAjax.WindowManager._draggingModeIndicatorElmt!=null){document.body.removeChild(SimileAjax.WindowManager._draggingModeIndicatorElmt);
SimileAjax.WindowManager._draggingModeIndicatorElmt=null;
}SimileAjax.WindowManager._draggedElement=null;
SimileAjax.WindowManager._draggedElementCallback=null;
SimileAjax.WindowManager._potentialDropTarget=null;
SimileAjax.WindowManager._dropTargetHighlightElement=null;
SimileAjax.WindowManager._lastCoords=null;
SimileAjax.WindowManager._ghostCoords=null;
SimileAjax.WindowManager._draggingMode="";
SimileAjax.WindowManager._dragging=false;
};
SimileAjax.WindowManager._findDropTarget=function(A){while(A!=null){if("ondrop" in A&&(typeof A.ondrop)=="function"){break;
}A=A.parentNode;
}return A;
};


/* xmlhttp.js */
SimileAjax.XmlHttp=new Object();
SimileAjax.XmlHttp._onReadyStateChange=function(A,D,B){switch(A.readyState){case 4:try{if(A.status==0||A.status==200){if(B){B(A);
}}else{if(D){D(A.statusText,A.status,A);
}}}catch(C){SimileAjax.Debug.exception("XmlHttp: Error handling onReadyStateChange",C);
}break;
}};
SimileAjax.XmlHttp._createRequest=function(){if(SimileAjax.Platform.browser.isIE){var A=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"];
for(var B=0;
B<A.length;
B++){try{var C=A[B];
var D=function(){return new ActiveXObject(C);
};
var F=D();
SimileAjax.XmlHttp._createRequest=D;
return F;
}catch(E){}}}try{var D=function(){return new XMLHttpRequest();
};
var F=D();
SimileAjax.XmlHttp._createRequest=D;
return F;
}catch(E){throw new Error("Failed to create an XMLHttpRequest object");
}};
SimileAjax.XmlHttp.get=function(A,D,C){var B=SimileAjax.XmlHttp._createRequest();
B.open("GET",A,true);
B.onreadystatechange=function(){SimileAjax.XmlHttp._onReadyStateChange(B,D,C);
};
B.send(null);
};
SimileAjax.XmlHttp.post=function(B,A,E,D){var C=SimileAjax.XmlHttp._createRequest();
C.open("POST",B,true);
C.onreadystatechange=function(){SimileAjax.XmlHttp._onReadyStateChange(C,E,D);
};
C.send(A);
};
SimileAjax.XmlHttp._forceXML=function(A){try{A.overrideMimeType("text/xml");
}catch(B){A.setrequestheader("Content-Type","text/xml");
}};

//GOOGLE EXCANVAS

// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns are not implemented.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Optimize. There is always room for speed improvements.

// only add this code if we do not already have a canvas implementation
if (!window.CanvasRenderingContext2D) {

(function () {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var G_vmlCanvasManager_ = {
    init: function (opt_doc) {
      var doc = opt_doc || document;
      if (/MSIE/.test(navigator.userAgent) && !window.opera) {
        var self = this;
        doc.attachEvent("onreadystatechange", function () {
          self.init_(doc);
        });
      }
    },

    init_: function (doc) {
      if (doc.readyState == "complete") {
        // create xmlns
        if (!doc.namespaces["g_vml_"]) {
          doc.namespaces.add("g_vml_", "urn:schemas-microsoft-com:vml");
        }

        // setup default css
        var ss = doc.createStyleSheet();
        ss.cssText = "canvas{display:inline-block;overflow:hidden;" +
            // default size is 300x150 in Gecko and Opera
            "text-align:left;width:300px;height:150px}" +
            "g_vml_\\:*{behavior:url(#default#VML)}";

        // find all canvas elements
        var els = doc.getElementsByTagName("canvas");
        for (var i = 0; i < els.length; i++) {
          if (!els[i].getContext) {
            this.initElement(els[i]);
          }
        }
      }
    },

    fixElement_: function (el) {
      // in IE before version 5.5 we would need to add HTML: to the tag name
      // but we do not care about IE before version 6
      var outerHTML = el.outerHTML;

      var newEl = el.ownerDocument.createElement(outerHTML);
      // if the tag is still open IE has created the children as siblings and
      // it has also created a tag with the name "/FOO"
      if (outerHTML.slice(-2) != "/>") {
        var tagName = "/" + el.tagName;
        var ns;
        // remove content
        while ((ns = el.nextSibling) && ns.tagName != tagName) {
          ns.removeNode();
        }
        // remove the incorrect closing tag
        if (ns) {
          ns.removeNode();
        }
      }
      el.parentNode.replaceChild(newEl, el);
      return newEl;
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function (el) {
      el = this.fixElement_(el);
      el.getContext = function () {
        if (this.context_) {
          return this.context_;
        }
        return this.context_ = new CanvasRenderingContext2D_(this);
      };

      // do not use inline function because that will leak memory
      el.attachEvent('onpropertychange', onPropertyChange);
      el.attachEvent('onresize', onResize);

      var attrs = el.attributes;
      if (attrs.width && attrs.width.specified) {
        // TODO: use runtimeStyle and coordsize
        // el.getContext().setWidth_(attrs.width.nodeValue);
        el.style.width = attrs.width.nodeValue + "px";
      } else {
        el.width = el.clientWidth;
      }
      if (attrs.height && attrs.height.specified) {
        // TODO: use runtimeStyle and coordsize
        // el.getContext().setHeight_(attrs.height.nodeValue);
        el.style.height = attrs.height.nodeValue + "px";
      } else {
        el.height = el.clientHeight;
      }
      //el.getContext().setCoordsize_()
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.style.width = el.attributes.width.nodeValue + "px";
        el.getContext().clearRect();
        break;
      case 'height':
        el.style.height = el.attributes.height.nodeValue + "px";
        el.getContext().clearRect();
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var dec2hex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      dec2hex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.arcScaleX_    = o1.arcScaleX_;
    o2.arcScaleY_    = o1.arcScaleY_;
  }

  function processStyle(styleString) {
    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.substring(0, 3) == "rgb") {
      var start = styleString.indexOf("(", 3);
      var end = styleString.indexOf(")", start + 1);
      var guts = styleString.substring(start + 1, end).split(",");

      str = "#";
      for (var i = 0; i < 3; i++) {
        str += dec2hex[Number(guts[i])];
      }

      if ((guts.length == 4) && (styleString.substr(3, 1) == "a")) {
        alpha = guts[3];
      }
    } else {
      str = styleString;
    }

    return [str, alpha];
  }

  function processLineCap(lineCap) {
    switch (lineCap) {
      case "butt":
        return "flat";
      case "round":
        return "round";
      case "square":
      default:
        return "square";
    }
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} surfaceElement The element that the 2D context should
   * be associated with
   */
   function CanvasRenderingContext2D_(surfaceElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = "#000";
    this.fillStyle = "#000";

    this.lineWidth = 1;
    this.lineJoin = "miter";
    this.lineCap = "butt";
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    this.canvas = surfaceElement;

    var el = surfaceElement.ownerDocument.createElement('div');
    el.style.width =  surfaceElement.clientWidth + 'px';
    el.style.height = surfaceElement.clientHeight + 'px';
    el.style.overflow = 'hidden';
    el.style.position = 'absolute';
    surfaceElement.appendChild(el);

    this.element_ = el;
    this.arcScaleX_ = 1;
    this.arcScaleY_ = 1;
  };

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    this.element_.innerHTML = "";
    this.currentPath_ = [];
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.

    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    this.currentPath_.push({type: "moveTo", x: aX, y: aY});
    this.currentX_ = aX;
    this.currentY_ = aY;
  };

  contextPrototype.lineTo = function(aX, aY) {
    this.currentPath_.push({type: "lineTo", x: aX, y: aY});
    this.currentX_ = aX;
    this.currentY_ = aY;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    this.currentPath_.push({type: "bezierCurveTo",
                           cp1x: aCP1x,
                           cp1y: aCP1y,
                           cp2x: aCP2x,
                           cp2y: aCP2y,
                           x: aX,
                           y: aY});
    this.currentX_ = aX;
    this.currentY_ = aY;
  };

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes
    var cp1x = this.currentX_ + 2.0 / 3.0 * (aCPx - this.currentX_);
    var cp1y = this.currentY_ + 2.0 / 3.0 * (aCPy - this.currentY_);
    var cp2x = cp1x + (aX - this.currentX_) / 3.0;
    var cp2y = cp1y + (aY - this.currentY_) / 3.0;
    this.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, aX, aY);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? "at" : "wa";

    var xStart = aX + (mc(aStartAngle) * aRadius) - Z2;
    var yStart = aY + (ms(aStartAngle) * aRadius) - Z2;

    var xEnd = aX + (mc(aEndAngle) * aRadius) - Z2;
    var yEnd = aY + (ms(aEndAngle) * aRadius) - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    this.currentPath_.push({type: arcType,
                           x: aX,
                           y: aY,
                           radius: aRadius,
                           xStart: xStart,
                           yStart: yStart,
                           xEnd: xEnd,
                           yEnd: yEnd});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    // Will destroy any existing path (same as FF behaviour)
    this.beginPath();
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    // Will destroy any existing path (same as FF behaviour)
    this.beginPath();
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_("gradient");
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0,
                                                   aR0, aX1,
                                                   aY1, aR1) {
    var gradient = new CanvasGradient_("gradientradial");
    gradient.radius1_ = aR0;
    gradient.radius2_ = aR1;
    gradient.focus_.x = aX0;
    gradient.focus_.y = aY0;
    return gradient;
  };

  contextPrototype.drawImage = function (image, var_args) {
    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw "Invalid number of arguments";
    }

    var d = this.getCoords_(dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;

    // For some reason that I've now forgotten, using divs didn't work
    vmlStr.push(' <g_vml_:group',
                ' coordsize="', Z * W, ',', Z * H, '"',
                ' coordorigin="0,0"' ,
                ' style="width:', W, ';height:', H, ';position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.

    if (this.m_[0][0] != 1 || this.m_[0][1]) {
      var filter = [];

      // Note the 12/21 reversal
      filter.push("M11='", this.m_[0][0], "',",
                  "M12='", this.m_[1][0], "',",
                  "M21='", this.m_[0][1], "',",
                  "M22='", this.m_[1][1], "',",
                  "Dx='", mr(d.x / Z), "',",
                  "Dy='", mr(d.y / Z), "'");

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = this.getCoords_(dx + dw, dy);
      var c3 = this.getCoords_(dx, dy + dh);
      var c4 = this.getCoords_(dx + dw, dy + dh);

      max.x = Math.max(max.x, c2.x, c3.x, c4.x);
      max.y = Math.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push("padding:0 ", mr(max.x / Z), "px ", mr(max.y / Z),
                  "px 0;filter:progid:DXImageTransform.Microsoft.Matrix(",
                  filter.join(""), ", sizingmethod='clip');")
    } else {
      vmlStr.push("top:", mr(d.y / Z), "px;left:", mr(d.x / Z), "px;")
    }

    vmlStr.push(' ">' ,
                '<g_vml_:image src="', image.src, '"',
                ' style="width:', Z * dw, ';',
                ' height:', Z * dh, ';"',
                ' cropleft="', sx / w, '"',
                ' croptop="', sy / h, '"',
                ' cropright="', (w - sx - sw) / w, '"',
                ' cropbottom="', (h - sy - sh) / h, '"',
                ' />',
                '</g_vml_:group>');

    this.element_.insertAdjacentHTML("BeforeEnd",
                                    vmlStr.join(""));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;
    var a = processStyle(aFill ? this.fillStyle : this.strokeStyle);
    var color = a[0];
    var opacity = a[1] * this.globalAlpha;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' fillcolor="', color, '"',
                 ' filled="', Boolean(aFill), '"',
                 ' style="position:absolute;width:', W, ';height:', H, ';"',
                 ' coordorigin="0 0" coordsize="', Z * W, ' ', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' strokeweight="', this.lineWidth, '"',
                 ' strokecolor="', color, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];

      if (p.type == "moveTo") {
        lineStr.push(" m ");
        var c = this.getCoords_(p.x, p.y);
        lineStr.push(mr(c.x), ",", mr(c.y));
      } else if (p.type == "lineTo") {
        lineStr.push(" l ");
        var c = this.getCoords_(p.x, p.y);
        lineStr.push(mr(c.x), ",", mr(c.y));
      } else if (p.type == "close") {
        lineStr.push(" x ");
      } else if (p.type == "bezierCurveTo") {
        lineStr.push(" c ");
        var c = this.getCoords_(p.x, p.y);
        var c1 = this.getCoords_(p.cp1x, p.cp1y);
        var c2 = this.getCoords_(p.cp2x, p.cp2y);
        lineStr.push(mr(c1.x), ",", mr(c1.y), ",",
                     mr(c2.x), ",", mr(c2.y), ",",
                     mr(c.x), ",", mr(c.y));
      } else if (p.type == "at" || p.type == "wa") {
        lineStr.push(" ", p.type, " ");
        var c  = this.getCoords_(p.x, p.y);
        var cStart = this.getCoords_(p.xStart, p.yStart);
        var cEnd = this.getCoords_(p.xEnd, p.yEnd);

        lineStr.push(mr(c.x - this.arcScaleX_ * p.radius), ",",
                     mr(c.y - this.arcScaleY_ * p.radius), " ",
                     mr(c.x + this.arcScaleX_ * p.radius), ",",
                     mr(c.y + this.arcScaleY_ * p.radius), " ",
                     mr(cStart.x), ",", mr(cStart.y), " ",
                     mr(cEnd.x), ",", mr(cEnd.y));
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if(c) {
        if (min.x == null || c.x < min.x) {
          min.x = c.x;
        }
        if (max.x == null || c.x > max.x) {
          max.x = c.x;
        }
        if (min.y == null || c.y < min.y) {
          min.y = c.y;
        }
        if (max.y == null || c.y > max.y) {
          max.y = c.y;
        }
      }
    }
    lineStr.push(' ">');

    if (typeof this.fillStyle == "object") {
      var focus = {x: "50%", y: "50%"};
      var width = (max.x - min.x);
      var height = (max.y - min.y);
      var dimension = (width > height) ? width : height;

      focus.x = mr((this.fillStyle.focus_.x / width) * 100 + 50) + "%";
      focus.y = mr((this.fillStyle.focus_.y / height) * 100 + 50) + "%";

      var colors = [];

      // inside radius (%)
      if (this.fillStyle.type_ == "gradientradial") {
        var inside = (this.fillStyle.radius1_ / dimension * 100);

        // percentage that outside radius exceeds inside radius
        var expansion = (this.fillStyle.radius2_ / dimension * 100) - inside;
      } else {
        var inside = 0;
        var expansion = 100;
      }

      var insidecolor = {offset: null, color: null};
      var outsidecolor = {offset: null, color: null};

      // We need to sort 'colors' by percentage, from 0 > 100 otherwise ie
      // won't interpret it correctly
      this.fillStyle.colors_.sort(function (cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      for (var i = 0; i < this.fillStyle.colors_.length; i++) {
        var fs = this.fillStyle.colors_[i];

        colors.push( (fs.offset * expansion) + inside, "% ", fs.color, ",");

        if (fs.offset > insidecolor.offset || insidecolor.offset == null) {
          insidecolor.offset = fs.offset;
          insidecolor.color = fs.color;
        }

        if (fs.offset < outsidecolor.offset || outsidecolor.offset == null) {
          outsidecolor.offset = fs.offset;
          outsidecolor.color = fs.color;
        }
      }
      colors.pop();

      lineStr.push('<g_vml_:fill',
                   ' color="', outsidecolor.color, '"',
                   ' color2="', insidecolor.color, '"',
                   ' type="', this.fillStyle.type_, '"',
                   ' focusposition="', focus.x, ', ', focus.y, '"',
                   ' colors="', colors.join(""), '"',
                   ' opacity="', opacity, '" />');
    } else if (aFill) {
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity, '" />');
    } else {
      lineStr.push(
        '<g_vml_:stroke',
        ' opacity="', opacity,'"',
        ' joinstyle="', this.lineJoin, '"',
        ' miterlimit="', this.miterLimit, '"',
        ' endcap="', processLineCap(this.lineCap) ,'"',
        ' weight="', this.lineWidth, 'px"',
        ' color="', color,'" />'
      );
    }

    lineStr.push("</g_vml_:shape>");

    this.element_.insertAdjacentHTML("beforeEnd", lineStr.join(""));

    this.currentPath_ = [];
  };

  contextPrototype.fill = function() {
    this.stroke(true);
  }

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: "close"});
  };

  /**
   * @private
   */
  contextPrototype.getCoords_ = function(aX, aY) {
    return {
      x: Z * (aX * this.m_[0][0] + aY * this.m_[1][0] + this.m_[2][0]) - Z2,
      y: Z * (aX * this.m_[0][1] + aY * this.m_[1][1] + this.m_[2][1]) - Z2
    }
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    copyState(this.aStack_.pop(), this);
    this.m_ = this.mStack_.pop();
  };

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    this.m_ = matrixMultiply(m1, this.m_);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    this.m_ = matrixMultiply(m1, this.m_);
  };

  contextPrototype.scale = function(aX, aY) {
    this.arcScaleX_ *= aX;
    this.arcScaleY_ *= aY;
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    this.m_ = matrixMultiply(m1, this.m_);
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function() {
    return new CanvasPattern_;
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.radius1_ = 0;
    this.radius2_ = 0;
    this.colors_ = [];
    this.focus_ = {x: 0, y: 0};
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: 1-aOffset, color: aColor});
  };

  function CanvasPattern_() {}

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;

})();

} // if

//TIMELINE PACKAGE - LOAD ORDER 2 of 3
//init
window.Timeline = new Object();
window.Timeline.DateTime = window.SimileAjax.DateTime
Timeline.serverLocale = "en";
Timeline.clientLocale = "en";
Timeline.urlPrefix = '/';

/* decorators.js */
Timeline.SpanHighlightDecorator=function(A){this._unit=("unit" in A)?A.unit:SimileAjax.NativeDateUnit;
this._startDate=(typeof A.startDate=="string")?this._unit.parseFromObject(A.startDate):A.startDate;
this._endDate=(typeof A.endDate=="string")?this._unit.parseFromObject(A.endDate):A.endDate;
this._startLabel=A.startLabel;
this._endLabel=A.endLabel;
this._color=A.color;
this._opacity=("opacity" in A)?A.opacity:100;
};
Timeline.SpanHighlightDecorator.prototype.initialize=function(B,A){this._band=B;
this._timeline=A;
this._layerDiv=null;
};
Timeline.SpanHighlightDecorator.prototype.paint=function(){if(this._layerDiv!=null){this._band.removeLayerDiv(this._layerDiv);
}this._layerDiv=this._band.createLayerDiv(10);
this._layerDiv.setAttribute("name","span-highlight-decorator");
this._layerDiv.style.display="none";
var E=this._band.getMinDate();
var C=this._band.getMaxDate();
if(this._unit.compare(this._startDate,C)<0&&this._unit.compare(this._endDate,E)>0){E=this._unit.later(E,this._startDate);
C=this._unit.earlier(C,this._endDate);
var D=this._band.dateToPixelOffset(E);
var I=this._band.dateToPixelOffset(C);
var G=this._timeline.getDocument();
var F=function(){var J=G.createElement("table");
J.insertRow(0).insertCell(0);
return J;
};
var B=G.createElement("div");
B.style.position="absolute";
B.style.overflow="hidden";
B.style.background=this._color;
if(this._opacity<100){SimileAjax.Graphics.setOpacity(B,this._opacity);
}this._layerDiv.appendChild(B);
var H=F();
H.style.position="absolute";
H.style.overflow="hidden";
H.style.fontSize="200%";
H.style.fontWeight="bold";
H.style.color=this._color;
H.rows[0].cells[0].innerHTML=this._startLabel;
this._layerDiv.appendChild(H);
var A=F();
A.style.position="absolute";
A.style.overflow="hidden";
A.style.fontSize="200%";
A.style.fontWeight="bold";
A.style.color=this._color;
A.rows[0].cells[0].innerHTML=this._endLabel;
this._layerDiv.appendChild(A);
if(this._timeline.isHorizontal()){B.style.left=D+"px";
B.style.width=(I-D)+"px";
B.style.top="0px";
B.style.height="100%";
H.style.right=(this._band.getTotalViewLength()-D)+"px";
H.style.width=(this._startLabel.length)+"em";
H.style.top="0px";
H.style.height="100%";
H.style.textAlign="right";
H.rows[0].style.verticalAlign="top";
A.style.left=I+"px";
A.style.width=(this._endLabel.length)+"em";
A.style.top="0px";
A.style.height="100%";
A.rows[0].style.verticalAlign="top";
}else{B.style.top=D+"px";
B.style.height=(I-D)+"px";
B.style.left="0px";
B.style.width="100%";
H.style.bottom=D+"px";
H.style.height="1.5px";
H.style.left="0px";
H.style.width="100%";
A.style.top=I+"px";
A.style.height="1.5px";
A.style.left="0px";
A.style.width="100%";
}}this._layerDiv.style.display="block";
};
Timeline.SpanHighlightDecorator.prototype.softPaint=function(){};
Timeline.PointHighlightDecorator=function(A){this._unit=("unit" in A)?A.unit:SimileAjax.NativeDateUnit;
this._date=(typeof A.date=="string")?this._unit.parseFromObject(A.date):A.date;
this._width=("width" in A)?A.width:10;
this._color=A.color;
this._opacity=("opacity" in A)?A.opacity:100;
};
Timeline.PointHighlightDecorator.prototype.initialize=function(B,A){this._band=B;
this._timeline=A;
this._layerDiv=null;
};
Timeline.PointHighlightDecorator.prototype.paint=function(){if(this._layerDiv!=null){this._band.removeLayerDiv(this._layerDiv);
}this._layerDiv=this._band.createLayerDiv(10);
this._layerDiv.setAttribute("name","span-highlight-decorator");
this._layerDiv.style.display="none";
var C=this._band.getMinDate();
var E=this._band.getMaxDate();
if(this._unit.compare(this._date,E)<0&&this._unit.compare(this._date,C)>0){var B=this._band.dateToPixelOffset(this._date);
var A=B-Math.round(this._width/2);
var D=this._timeline.getDocument();
var F=D.createElement("div");
F.style.position="absolute";
F.style.overflow="hidden";
F.style.background=this._color;
if(this._opacity<100){SimileAjax.Graphics.setOpacity(F,this._opacity);
}this._layerDiv.appendChild(F);
if(this._timeline.isHorizontal()){F.style.left=A+"px";
F.style.width=this._width+"px";
F.style.top="0px";
F.style.height="100%";
}else{F.style.top=A+"px";
F.style.height=this._width+"px";
F.style.left="0px";
F.style.width="100%";
}}this._layerDiv.style.display="block";
};
Timeline.PointHighlightDecorator.prototype.softPaint=function(){};


/* detailed-painter.js */
Timeline.DetailedEventPainter=function(A){this._params=A;
this._onSelectListeners=[];
this._filterMatcher=null;
this._highlightMatcher=null;
this._frc=null;
this._eventIdToElmt={};
};
Timeline.DetailedEventPainter.prototype.initialize=function(B,A){this._band=B;
this._timeline=A;
this._backLayer=null;
this._eventLayer=null;
this._lineLayer=null;
this._highlightLayer=null;
this._eventIdToElmt=null;
};
Timeline.DetailedEventPainter.prototype.addOnSelectListener=function(A){this._onSelectListeners.push(A);
};
Timeline.DetailedEventPainter.prototype.removeOnSelectListener=function(B){for(var A=0;
A<this._onSelectListeners.length;
A++){if(this._onSelectListeners[A]==B){this._onSelectListeners.splice(A,1);
break;
}}};
Timeline.DetailedEventPainter.prototype.getFilterMatcher=function(){return this._filterMatcher;
};
Timeline.DetailedEventPainter.prototype.setFilterMatcher=function(A){this._filterMatcher=A;
};
Timeline.DetailedEventPainter.prototype.getHighlightMatcher=function(){return this._highlightMatcher;
};
Timeline.DetailedEventPainter.prototype.setHighlightMatcher=function(A){this._highlightMatcher=A;
};
Timeline.DetailedEventPainter.prototype.paint=function(){var B=this._band.getEventSource();
if(B==null){return ;
}this._eventIdToElmt={};
this._prepareForPainting();
var I=this._params.theme.event;
var G=Math.max(I.track.height,this._frc.getLineHeight());
var F={trackOffset:Math.round(this._band.getViewWidth()/2-G/2),trackHeight:G,trackGap:I.track.gap,trackIncrement:G+I.track.gap,icon:I.instant.icon,iconWidth:I.instant.iconWidth,iconHeight:I.instant.iconHeight,labelWidth:I.label.width};
var C=this._band.getMinDate();
var A=this._band.getMaxDate();
var J=(this._filterMatcher!=null)?this._filterMatcher:function(K){return true;
};
var E=(this._highlightMatcher!=null)?this._highlightMatcher:function(K){return -1;
};
var D=B.getEventReverseIterator(C,A);
while(D.hasNext()){var H=D.next();
if(J(H)){this.paintEvent(H,F,this._params.theme,E(H));
}}this._highlightLayer.style.display="block";
this._lineLayer.style.display="block";
this._eventLayer.style.display="block";
};
Timeline.DetailedEventPainter.prototype.softPaint=function(){};
Timeline.DetailedEventPainter.prototype._prepareForPainting=function(){var B=this._band;
if(this._backLayer==null){this._backLayer=this._band.createLayerDiv(0,"timeline-band-events");
this._backLayer.style.visibility="hidden";
var A=document.createElement("span");
A.className="timeline-event-label";
this._backLayer.appendChild(A);
this._frc=SimileAjax.Graphics.getFontRenderingContext(A);
}this._frc.update();
this._lowerTracks=[];
this._upperTracks=[];
if(this._highlightLayer!=null){B.removeLayerDiv(this._highlightLayer);
}this._highlightLayer=B.createLayerDiv(105,"timeline-band-highlights");
this._highlightLayer.style.display="none";
if(this._lineLayer!=null){B.removeLayerDiv(this._lineLayer);
}this._lineLayer=B.createLayerDiv(110,"timeline-band-lines");
this._lineLayer.style.display="none";
if(this._eventLayer!=null){B.removeLayerDiv(this._eventLayer);
}this._eventLayer=B.createLayerDiv(110,"timeline-band-events");
this._eventLayer.style.display="none";
};
Timeline.DetailedEventPainter.prototype.paintEvent=function(B,C,D,A){if(B.isInstant()){this.paintInstantEvent(B,C,D,A);
}else{this.paintDurationEvent(B,C,D,A);
}};
Timeline.DetailedEventPainter.prototype.paintInstantEvent=function(B,C,D,A){if(B.isImprecise()){this.paintImpreciseInstantEvent(B,C,D,A);
}else{this.paintPreciseInstantEvent(B,C,D,A);
}};
Timeline.DetailedEventPainter.prototype.paintDurationEvent=function(B,C,D,A){if(B.isImprecise()){this.paintImpreciseDurationEvent(B,C,D,A);
}else{this.paintPreciseDurationEvent(B,C,D,A);
}};
Timeline.DetailedEventPainter.prototype.paintPreciseInstantEvent=function(K,N,Q,O){var S=this._timeline.getDocument();
var J=K.getText();
var E=K.getStart();
var C=Math.round(this._band.dateToPixelOffset(E));
var A=Math.round(C+N.iconWidth/2);
var I=Math.round(C-N.iconWidth/2);
var G=this._frc.computeSize(J);
var D=this._findFreeTrackForSolid(A,C);
var B=this._paintEventIcon(K,D,I,N,Q);
var T=A+Q.event.label.offsetFromLine;
var P=D;
var F=this._getTrackData(D);
if(Math.min(F.solid,F.text)>=T+G.width){F.solid=I;
F.text=T;
}else{F.solid=I;
T=C+Q.event.label.offsetFromLine;
P=this._findFreeTrackForText(D,T+G.width,function(U){U.line=C-2;
});
this._getTrackData(P).text=I;
this._paintEventLine(K,C,D,P,N,Q);
}var R=Math.round(N.trackOffset+P*N.trackIncrement+N.trackHeight/2-G.height/2);
var M=this._paintEventLabel(K,J,T,R,G.width,G.height,Q);
var L=this;
var H=function(U,V,W){return L._onClickInstantEvent(B.elmt,V,K);
};
SimileAjax.DOM.registerEvent(B.elmt,"mousedown",H);
SimileAjax.DOM.registerEvent(M.elmt,"mousedown",H);
this._createHighlightDiv(O,B,Q);
this._eventIdToElmt[K.getID()]=B.elmt;
};
Timeline.DetailedEventPainter.prototype.paintImpreciseInstantEvent=function(N,Q,V,R){var X=this._timeline.getDocument();
var M=N.getText();
var H=N.getStart();
var S=N.getEnd();
var E=Math.round(this._band.dateToPixelOffset(H));
var B=Math.round(this._band.dateToPixelOffset(S));
var A=Math.round(E+Q.iconWidth/2);
var L=Math.round(E-Q.iconWidth/2);
var J=this._frc.computeSize(M);
var F=this._findFreeTrackForSolid(B,E);
var G=this._paintEventTape(N,F,E,B,V.event.instant.impreciseColor,V.event.instant.impreciseOpacity,Q,V);
var C=this._paintEventIcon(N,F,L,Q,V);
var I=this._getTrackData(F);
I.solid=L;
var W=A+V.event.label.offsetFromLine;
var D=W+J.width;
var T;
if(D<B){T=F;
}else{W=E+V.event.label.offsetFromLine;
D=W+J.width;
T=this._findFreeTrackForText(F,D,function(Y){Y.line=E-2;
});
this._getTrackData(T).text=L;
this._paintEventLine(N,E,F,T,Q,V);
}var U=Math.round(Q.trackOffset+T*Q.trackIncrement+Q.trackHeight/2-J.height/2);
var P=this._paintEventLabel(N,M,W,U,J.width,J.height,V);
var O=this;
var K=function(Y,Z,a){return O._onClickInstantEvent(C.elmt,Z,N);
};
SimileAjax.DOM.registerEvent(C.elmt,"mousedown",K);
SimileAjax.DOM.registerEvent(G.elmt,"mousedown",K);
SimileAjax.DOM.registerEvent(P.elmt,"mousedown",K);
this._createHighlightDiv(R,C,V);
this._eventIdToElmt[N.getID()]=C.elmt;
};
Timeline.DetailedEventPainter.prototype.paintPreciseDurationEvent=function(J,M,S,O){var T=this._timeline.getDocument();
var I=J.getText();
var D=J.getStart();
var P=J.getEnd();
var B=Math.round(this._band.dateToPixelOffset(D));
var A=Math.round(this._band.dateToPixelOffset(P));
var F=this._frc.computeSize(I);
var E=this._findFreeTrackForSolid(A);
var N=J.getColor();
N=N!=null?N:S.event.duration.color;
var C=this._paintEventTape(J,E,B,A,N,100,M,S);
var H=this._getTrackData(E);
H.solid=B;
var U=B+S.event.label.offsetFromLine;
var Q=this._findFreeTrackForText(E,U+F.width,function(V){V.line=B-2;
});
this._getTrackData(Q).text=B-2;
this._paintEventLine(J,B,E,Q,M,S);
var R=Math.round(M.trackOffset+Q*M.trackIncrement+M.trackHeight/2-F.height/2);
var L=this._paintEventLabel(J,I,U,R,F.width,F.height,S);
var K=this;
var G=function(V,W,X){return K._onClickDurationEvent(C.elmt,W,J);
};
SimileAjax.DOM.registerEvent(C.elmt,"mousedown",G);
SimileAjax.DOM.registerEvent(L.elmt,"mousedown",G);
this._createHighlightDiv(O,C,S);
this._eventIdToElmt[J.getID()]=C.elmt;
};
Timeline.DetailedEventPainter.prototype.paintImpreciseDurationEvent=function(L,P,W,S){var Z=this._timeline.getDocument();
var K=L.getText();
var D=L.getStart();
var Q=L.getLatestStart();
var T=L.getEnd();
var X=L.getEarliestEnd();
var B=Math.round(this._band.dateToPixelOffset(D));
var F=Math.round(this._band.dateToPixelOffset(Q));
var A=Math.round(this._band.dateToPixelOffset(T));
var G=Math.round(this._band.dateToPixelOffset(X));
var H=this._frc.computeSize(K);
var E=this._findFreeTrackForSolid(A);
var R=L.getColor();
R=R!=null?R:W.event.duration.color;
var O=this._paintEventTape(L,E,B,A,W.event.duration.impreciseColor,W.event.duration.impreciseOpacity,P,W);
var C=this._paintEventTape(L,E,F,G,R,100,P,W);
var J=this._getTrackData(E);
J.solid=B;
var Y=F+W.event.label.offsetFromLine;
var U=this._findFreeTrackForText(E,Y+H.width,function(a){a.line=F-2;
});
this._getTrackData(U).text=F-2;
this._paintEventLine(L,F,E,U,P,W);
var V=Math.round(P.trackOffset+U*P.trackIncrement+P.trackHeight/2-H.height/2);
var N=this._paintEventLabel(L,K,Y,V,H.width,H.height,W);
var M=this;
var I=function(a,b,c){return M._onClickDurationEvent(C.elmt,b,L);
};
SimileAjax.DOM.registerEvent(C.elmt,"mousedown",I);
SimileAjax.DOM.registerEvent(N.elmt,"mousedown",I);
this._createHighlightDiv(S,C,W);
this._eventIdToElmt[L.getID()]=C.elmt;
};
Timeline.DetailedEventPainter.prototype._findFreeTrackForSolid=function(B,A){for(var D=0;
true;
D++){if(D<this._lowerTracks.length){var C=this._lowerTracks[D];
if(Math.min(C.solid,C.text)>B&&(!(A)||C.line>A)){return D;
}}else{this._lowerTracks.push({solid:Number.POSITIVE_INFINITY,text:Number.POSITIVE_INFINITY,line:Number.POSITIVE_INFINITY});
return D;
}if(D<this._upperTracks.length){var C=this._upperTracks[D];
if(Math.min(C.solid,C.text)>B&&(!(A)||C.line>A)){return -1-D;
}}else{this._upperTracks.push({solid:Number.POSITIVE_INFINITY,text:Number.POSITIVE_INFINITY,line:Number.POSITIVE_INFINITY});
return -1-D;
}}};
Timeline.DetailedEventPainter.prototype._findFreeTrackForText=function(D,C,H){var F;
var G;
var B;
var J;
if(D<0){F=true;
B=-D;
G=this._findFreeUpperTrackForText(B,C);
J=-1-G;
}else{if(D>0){F=false;
B=D+1;
G=this._findFreeLowerTrackForText(B,C);
J=G;
}else{var A=this._findFreeUpperTrackForText(0,C);
var I=this._findFreeLowerTrackForText(1,C);
if(I-1<=A){F=false;
B=1;
G=I;
J=G;
}else{F=true;
B=0;
G=A;
J=-1-G;
}}}if(F){if(G==this._upperTracks.length){this._upperTracks.push({solid:Number.POSITIVE_INFINITY,text:Number.POSITIVE_INFINITY,line:Number.POSITIVE_INFINITY});
}for(var E=B;
E<G;
E++){H(this._upperTracks[E]);
}}else{if(G==this._lowerTracks.length){this._lowerTracks.push({solid:Number.POSITIVE_INFINITY,text:Number.POSITIVE_INFINITY,line:Number.POSITIVE_INFINITY});
}for(var E=B;
E<G;
E++){H(this._lowerTracks[E]);
}}return J;
};
Timeline.DetailedEventPainter.prototype._findFreeLowerTrackForText=function(A,C){for(;
A<this._lowerTracks.length;
A++){var B=this._lowerTracks[A];
if(Math.min(B.solid,B.text)>=C){break;
}}return A;
};
Timeline.DetailedEventPainter.prototype._findFreeUpperTrackForText=function(A,C){for(;
A<this._upperTracks.length;
A++){var B=this._upperTracks[A];
if(Math.min(B.solid,B.text)>=C){break;
}}return A;
};
Timeline.DetailedEventPainter.prototype._getTrackData=function(A){return(A<0)?this._upperTracks[-A-1]:this._lowerTracks[A];
};
Timeline.DetailedEventPainter.prototype._paintEventLine=function(I,C,F,A,G,D){var H=Math.round(G.trackOffset+F*G.trackIncrement+G.trackHeight/2);
var J=Math.round(Math.abs(A-F)*G.trackIncrement);
var E="1px solid "+D.event.label.lineColor;
var B=this._timeline.getDocument().createElement("div");
B.style.position="absolute";
B.style.left=C+"px";
B.style.width=D.event.label.offsetFromLine+"px";
B.style.height=J+"px";
if(F>A){B.style.top=(H-J)+"px";
B.style.borderTop=E;
}else{B.style.top=H+"px";
B.style.borderBottom=E;
}B.style.borderLeft=E;
this._lineLayer.appendChild(B);
};
Timeline.DetailedEventPainter.prototype._paintEventIcon=function(I,E,B,F,D){var H=I.getIcon();
H=H!=null?H:F.icon;
var J=F.trackOffset+E*F.trackIncrement+F.trackHeight/2;
var G=Math.round(J-F.iconHeight/2);
var C=SimileAjax.Graphics.createTranslucentImage(H);
var A=this._timeline.getDocument().createElement("div");
A.style.position="absolute";
A.style.left=B+"px";
A.style.top=G+"px";
A.appendChild(C);
A.style.cursor="pointer";
this._eventLayer.appendChild(A);
return{left:B,top:G,width:F.iconWidth,height:F.iconHeight,elmt:A};
};
Timeline.DetailedEventPainter.prototype._paintEventLabel=function(H,I,B,F,A,J,D){var G=this._timeline.getDocument();
var K=G.createElement("div");
K.style.position="absolute";
K.style.left=B+"px";
K.style.width=A+"px";
K.style.top=F+"px";
K.style.height=J+"px";
K.style.backgroundColor=D.event.label.backgroundColor;
SimileAjax.Graphics.setOpacity(K,D.event.label.backgroundOpacity);
this._eventLayer.appendChild(K);
var E=G.createElement("div");
E.style.position="absolute";
E.style.left=B+"px";
E.style.width=A+"px";
E.style.top=F+"px";
E.innerHTML=I;
E.style.cursor="pointer";
var C=H.getTextColor();
if(C==null){C=H.getColor();
}if(C!=null){E.style.color=C;
}this._eventLayer.appendChild(E);
return{left:B,top:F,width:A,height:J,elmt:E};
};
Timeline.DetailedEventPainter.prototype._paintEventTape=function(L,H,E,A,C,G,I,F){var B=A-E;
var D=F.event.tape.height;
var M=I.trackOffset+H*I.trackIncrement+I.trackHeight/2;
var J=Math.round(M-D/2);
var K=this._timeline.getDocument().createElement("div");
K.style.position="absolute";
K.style.left=E+"px";
K.style.width=B+"px";
K.style.top=J+"px";
K.style.height=D+"px";
K.style.backgroundColor=C;
K.style.overflow="hidden";
K.style.cursor="pointer";
SimileAjax.Graphics.setOpacity(K,G);
this._eventLayer.appendChild(K);
return{left:E,top:J,width:B,height:D,elmt:K};
};
Timeline.DetailedEventPainter.prototype._createHighlightDiv=function(A,C,E){if(A>=0){var D=this._timeline.getDocument();
var G=E.event;
var B=G.highlightColors[Math.min(A,G.highlightColors.length-1)];
var F=D.createElement("div");
F.style.position="absolute";
F.style.overflow="hidden";
F.style.left=(C.left-2)+"px";
F.style.width=(C.width+4)+"px";
F.style.top=(C.top-2)+"px";
F.style.height=(C.height+4)+"px";
F.style.background=B;
this._highlightLayer.appendChild(F);
}};
Timeline.DetailedEventPainter.prototype._onClickInstantEvent=function(B,C,A){var D=SimileAjax.DOM.getPageCoordinates(B);
this._showBubble(D.left+Math.ceil(B.offsetWidth/2),D.top+Math.ceil(B.offsetHeight/2),A);
this._fireOnSelect(A.getID());
C.cancelBubble=true;
SimileAjax.DOM.cancelEvent(C);
return false;
};
Timeline.DetailedEventPainter.prototype._onClickDurationEvent=function(D,C,B){if("pageX" in C){var A=C.pageX;
var F=C.pageY;
}else{var E=SimileAjax.DOM.getPageCoordinates(D);
var A=C.offsetX+E.left;
var F=C.offsetY+E.top;
}this._showBubble(A,F,B);
this._fireOnSelect(B.getID());
C.cancelBubble=true;
SimileAjax.DOM.cancelEvent(C);
return false;
};
Timeline.DetailedEventPainter.prototype.showBubble=function(A){var B=this._eventIdToElmt[A.getID()];
if(B){var C=SimileAjax.DOM.getPageCoordinates(B);
this._showBubble(C.left+B.offsetWidth/2,C.top+B.offsetHeight/2,A);
}};
Timeline.DetailedEventPainter.prototype._showBubble=function(A,D,B){var C=document.createElement("div");
B.fillInfoBubble(C,this._params.theme,this._band.getLabeller());
SimileAjax.WindowManager.cancelPopups();
SimileAjax.Graphics.createBubbleForContentAndPoint(C,A,D,this._params.theme.event.bubble.width);
};
Timeline.DetailedEventPainter.prototype._fireOnSelect=function(B){for(var A=0;
A<this._onSelectListeners.length;
A++){this._onSelectListeners[A](B);
}};


/* ether-painters.js */
Timeline.GregorianEtherPainter=function(A){this._params=A;
this._theme=A.theme;
this._unit=A.unit;
this._multiple=("multiple" in A)?A.multiple:1;
};
Timeline.GregorianEtherPainter.prototype.initialize=function(C,B){this._band=C;
this._timeline=B;
this._backgroundLayer=C.createLayerDiv(0);
this._backgroundLayer.setAttribute("name","ether-background");
this._backgroundLayer.style.background=this._theme.ether.backgroundColors[C.getIndex()];
this._markerLayer=null;
this._lineLayer=null;
var D=("align" in this._params&&this._params.align!=undefined)?this._params.align:this._theme.ether.interval.marker[B.isHorizontal()?"hAlign":"vAlign"];
var A=("showLine" in this._params)?this._params.showLine:this._theme.ether.interval.line.show;
this._intervalMarkerLayout=new Timeline.EtherIntervalMarkerLayout(this._timeline,this._band,this._theme,D,A);
this._highlight=new Timeline.EtherHighlight(this._timeline,this._band,this._theme,this._backgroundLayer);
};
Timeline.GregorianEtherPainter.prototype.setHighlight=function(A,B){this._highlight.position(A,B);
};
Timeline.GregorianEtherPainter.prototype.paint=function(){if(this._markerLayer){this._band.removeLayerDiv(this._markerLayer);
}this._markerLayer=this._band.createLayerDiv(100);
this._markerLayer.setAttribute("name","ether-markers");
this._markerLayer.style.display="none";
if(this._lineLayer){this._band.removeLayerDiv(this._lineLayer);
}this._lineLayer=this._band.createLayerDiv(1);
this._lineLayer.setAttribute("name","ether-lines");
this._lineLayer.style.display="none";
var C=this._band.getMinDate();
var F=this._band.getMaxDate();
var B=this._band.getTimeZone();
var E=this._band.getLabeller();
SimileAjax.DateTime.roundDownToInterval(C,this._unit,B,this._multiple,this._theme.firstDayOfWeek);
var D=this;
var A=function(G){for(var H=0;
H<D._multiple;
H++){SimileAjax.DateTime.incrementByInterval(G,D._unit);
}};
while(C.getTime()<F.getTime()){this._intervalMarkerLayout.createIntervalMarker(C,E,this._unit,this._markerLayer,this._lineLayer);
A(C);
}this._markerLayer.style.display="block";
this._lineLayer.style.display="block";
};
Timeline.GregorianEtherPainter.prototype.softPaint=function(){};
Timeline.HotZoneGregorianEtherPainter=function(G){this._params=G;
this._theme=G.theme;
this._zones=[{startTime:Number.NEGATIVE_INFINITY,endTime:Number.POSITIVE_INFINITY,unit:G.unit,multiple:1}];
for(var E=0;
E<G.zones.length;
E++){var B=G.zones[E];
var D=SimileAjax.DateTime.parseGregorianDateTime(B.start).getTime();
var F=SimileAjax.DateTime.parseGregorianDateTime(B.end).getTime();
for(var C=0;
C<this._zones.length&&F>D;
C++){var A=this._zones[C];
if(D<A.endTime){if(D>A.startTime){this._zones.splice(C,0,{startTime:A.startTime,endTime:D,unit:A.unit,multiple:A.multiple});
C++;
A.startTime=D;
}if(F<A.endTime){this._zones.splice(C,0,{startTime:D,endTime:F,unit:B.unit,multiple:(B.multiple)?B.multiple:1});
C++;
A.startTime=F;
D=F;
}else{A.multiple=B.multiple;
A.unit=B.unit;
D=A.endTime;
}}}}};
Timeline.HotZoneGregorianEtherPainter.prototype.initialize=function(C,B){this._band=C;
this._timeline=B;
this._backgroundLayer=C.createLayerDiv(0);
this._backgroundLayer.setAttribute("name","ether-background");
this._backgroundLayer.style.background=this._theme.ether.backgroundColors[C.getIndex()];
this._markerLayer=null;
this._lineLayer=null;
var D=("align" in this._params&&this._params.align!=undefined)?this._params.align:this._theme.ether.interval.marker[B.isHorizontal()?"hAlign":"vAlign"];
var A=("showLine" in this._params)?this._params.showLine:this._theme.ether.interval.line.show;
this._intervalMarkerLayout=new Timeline.EtherIntervalMarkerLayout(this._timeline,this._band,this._theme,D,A);
this._highlight=new Timeline.EtherHighlight(this._timeline,this._band,this._theme,this._backgroundLayer);
};
Timeline.HotZoneGregorianEtherPainter.prototype.setHighlight=function(A,B){this._highlight.position(A,B);
};
Timeline.HotZoneGregorianEtherPainter.prototype.paint=function(){if(this._markerLayer){this._band.removeLayerDiv(this._markerLayer);
}this._markerLayer=this._band.createLayerDiv(100);
this._markerLayer.setAttribute("name","ether-markers");
this._markerLayer.style.display="none";
if(this._lineLayer){this._band.removeLayerDiv(this._lineLayer);
}this._lineLayer=this._band.createLayerDiv(1);
this._lineLayer.setAttribute("name","ether-lines");
this._lineLayer.style.display="none";
var D=this._band.getMinDate();
var A=this._band.getMaxDate();
var K=this._band.getTimeZone();
var I=this._band.getLabeller();
var B=this;
var L=function(N,M){for(var O=0;
O<M.multiple;
O++){SimileAjax.DateTime.incrementByInterval(N,M.unit);
}};
var C=0;
while(C<this._zones.length){if(D.getTime()<this._zones[C].endTime){break;
}C++;
}var E=this._zones.length-1;
while(E>=0){if(A.getTime()>this._zones[E].startTime){break;
}E--;
}for(var H=C;
H<=E;
H++){var G=this._zones[H];
var J=new Date(Math.max(D.getTime(),G.startTime));
var F=new Date(Math.min(A.getTime(),G.endTime));
SimileAjax.DateTime.roundDownToInterval(J,G.unit,K,G.multiple,this._theme.firstDayOfWeek);
SimileAjax.DateTime.roundUpToInterval(F,G.unit,K,G.multiple,this._theme.firstDayOfWeek);
while(J.getTime()<F.getTime()){this._intervalMarkerLayout.createIntervalMarker(J,I,G.unit,this._markerLayer,this._lineLayer);
L(J,G);
}}this._markerLayer.style.display="block";
this._lineLayer.style.display="block";
};
Timeline.HotZoneGregorianEtherPainter.prototype.softPaint=function(){};
Timeline.YearCountEtherPainter=function(A){this._params=A;
this._theme=A.theme;
this._startDate=SimileAjax.DateTime.parseGregorianDateTime(A.startDate);
this._multiple=("multiple" in A)?A.multiple:1;
};
Timeline.YearCountEtherPainter.prototype.initialize=function(C,B){this._band=C;
this._timeline=B;
this._backgroundLayer=C.createLayerDiv(0);
this._backgroundLayer.setAttribute("name","ether-background");
this._backgroundLayer.style.background=this._theme.ether.backgroundColors[C.getIndex()];
this._markerLayer=null;
this._lineLayer=null;
var D=("align" in this._params)?this._params.align:this._theme.ether.interval.marker[B.isHorizontal()?"hAlign":"vAlign"];
var A=("showLine" in this._params)?this._params.showLine:this._theme.ether.interval.line.show;
this._intervalMarkerLayout=new Timeline.EtherIntervalMarkerLayout(this._timeline,this._band,this._theme,D,A);
this._highlight=new Timeline.EtherHighlight(this._timeline,this._band,this._theme,this._backgroundLayer);
};
Timeline.YearCountEtherPainter.prototype.setHighlight=function(A,B){this._highlight.position(A,B);
};
Timeline.YearCountEtherPainter.prototype.paint=function(){if(this._markerLayer){this._band.removeLayerDiv(this._markerLayer);
}this._markerLayer=this._band.createLayerDiv(100);
this._markerLayer.setAttribute("name","ether-markers");
this._markerLayer.style.display="none";
if(this._lineLayer){this._band.removeLayerDiv(this._lineLayer);
}this._lineLayer=this._band.createLayerDiv(1);
this._lineLayer.setAttribute("name","ether-lines");
this._lineLayer.style.display="none";
var B=new Date(this._startDate.getTime());
var F=this._band.getMaxDate();
var E=this._band.getMinDate().getUTCFullYear()-this._startDate.getUTCFullYear();
B.setUTCFullYear(this._band.getMinDate().getUTCFullYear()-E%this._multiple);
var C=this;
var A=function(G){for(var H=0;
H<C._multiple;
H++){SimileAjax.DateTime.incrementByInterval(G,SimileAjax.DateTime.YEAR);
}};
var D={labelInterval:function(G,I){var H=G.getUTCFullYear()-C._startDate.getUTCFullYear();
return{text:H,emphasized:H==0};
}};
while(B.getTime()<F.getTime()){this._intervalMarkerLayout.createIntervalMarker(B,D,SimileAjax.DateTime.YEAR,this._markerLayer,this._lineLayer);
A(B);
}this._markerLayer.style.display="block";
this._lineLayer.style.display="block";
};
Timeline.YearCountEtherPainter.prototype.softPaint=function(){};
Timeline.QuarterlyEtherPainter=function(A){this._params=A;
this._theme=A.theme;
this._startDate=SimileAjax.DateTime.parseGregorianDateTime(A.startDate);
};
Timeline.QuarterlyEtherPainter.prototype.initialize=function(C,B){this._band=C;
this._timeline=B;
this._backgroundLayer=C.createLayerDiv(0);
this._backgroundLayer.setAttribute("name","ether-background");
this._backgroundLayer.style.background=this._theme.ether.backgroundColors[C.getIndex()];
this._markerLayer=null;
this._lineLayer=null;
var D=("align" in this._params)?this._params.align:this._theme.ether.interval.marker[B.isHorizontal()?"hAlign":"vAlign"];
var A=("showLine" in this._params)?this._params.showLine:this._theme.ether.interval.line.show;
this._intervalMarkerLayout=new Timeline.EtherIntervalMarkerLayout(this._timeline,this._band,this._theme,D,A);
this._highlight=new Timeline.EtherHighlight(this._timeline,this._band,this._theme,this._backgroundLayer);
};
Timeline.QuarterlyEtherPainter.prototype.setHighlight=function(A,B){this._highlight.position(A,B);
};
Timeline.QuarterlyEtherPainter.prototype.paint=function(){if(this._markerLayer){this._band.removeLayerDiv(this._markerLayer);
}this._markerLayer=this._band.createLayerDiv(100);
this._markerLayer.setAttribute("name","ether-markers");
this._markerLayer.style.display="none";
if(this._lineLayer){this._band.removeLayerDiv(this._lineLayer);
}this._lineLayer=this._band.createLayerDiv(1);
this._lineLayer.setAttribute("name","ether-lines");
this._lineLayer.style.display="none";
var B=new Date(0);
var E=this._band.getMaxDate();
B.setUTCFullYear(Math.max(this._startDate.getUTCFullYear(),this._band.getMinDate().getUTCFullYear()));
B.setUTCMonth(this._startDate.getUTCMonth());
var C=this;
var A=function(F){F.setUTCMonth(F.getUTCMonth()+3);
};
var D={labelInterval:function(F,H){var G=(4+(F.getUTCMonth()-C._startDate.getUTCMonth())/3)%4;
if(G!=0){return{text:"Q"+(G+1),emphasized:false};
}else{return{text:"Y"+(F.getUTCFullYear()-C._startDate.getUTCFullYear()+1),emphasized:true};
}}};
while(B.getTime()<E.getTime()){this._intervalMarkerLayout.createIntervalMarker(B,D,SimileAjax.DateTime.YEAR,this._markerLayer,this._lineLayer);
A(B);
}this._markerLayer.style.display="block";
this._lineLayer.style.display="block";
};
Timeline.QuarterlyEtherPainter.prototype.softPaint=function(){};
Timeline.EtherIntervalMarkerLayout=function(M,L,C,E,H){var A=M.isHorizontal();
if(A){if(E=="Top"){this.positionDiv=function(O,N){O.style.left=N+"px";
O.style.top="0px";
};
}else{this.positionDiv=function(O,N){O.style.left=N+"px";
O.style.bottom="0px";
};
}}else{if(E=="Left"){this.positionDiv=function(O,N){O.style.top=N+"px";
O.style.left="0px";
};
}else{this.positionDiv=function(O,N){O.style.top=N+"px";
O.style.right="0px";
};
}}var D=C.ether.interval.marker;
var I=C.ether.interval.line;
var B=C.ether.interval.weekend;
var K=(A?"h":"v")+E;
var G=D[K+"Styler"];
var J=D[K+"EmphasizedStyler"];
var F=SimileAjax.DateTime.gregorianUnitLengths[SimileAjax.DateTime.DAY];
this.createIntervalMarker=function(T,a,b,c,Q){var U=Math.round(L.dateToPixelOffset(T));
if(H&&b!=SimileAjax.DateTime.WEEK){var V=M.getDocument().createElement("div");
V.style.position="absolute";
if(I.opacity<100){SimileAjax.Graphics.setOpacity(V,I.opacity);
}if(A){V.style.borderLeft="1px solid "+I.color;
V.style.left=U+"px";
V.style.width="1px";
V.style.top="0px";
V.style.height="100%";
}else{V.style.borderTop="1px solid "+I.color;
V.style.top=U+"px";
V.style.height="1px";
V.style.left="0px";
V.style.width="100%";
}Q.appendChild(V);
}if(b==SimileAjax.DateTime.WEEK){var N=C.firstDayOfWeek;
var W=new Date(T.getTime()+(6-N-7)*F);
var Z=new Date(W.getTime()+2*F);
var X=Math.round(L.dateToPixelOffset(W));
var S=Math.round(L.dateToPixelOffset(Z));
var R=Math.max(1,S-X);
var P=M.getDocument().createElement("div");
P.style.position="absolute";
P.style.background=B.color;
if(B.opacity<100){SimileAjax.Graphics.setOpacity(P,B.opacity);
}if(A){P.style.left=X+"px";
P.style.width=R+"px";
P.style.top="0px";
P.style.height="100%";
}else{P.style.top=X+"px";
P.style.height=R+"px";
P.style.left="0px";
P.style.width="100%";
}Q.appendChild(P);
}var Y=a.labelInterval(T,b);
var O=M.getDocument().createElement("div");
O.innerHTML=Y.text;
O.style.position="absolute";
(Y.emphasized?J:G)(O);
this.positionDiv(O,U);
c.appendChild(O);
return O;
};
};
Timeline.EtherHighlight=function(C,E,D,B){var A=C.isHorizontal();
this._highlightDiv=null;
this._createHighlightDiv=function(){if(this._highlightDiv==null){this._highlightDiv=C.getDocument().createElement("div");
this._highlightDiv.setAttribute("name","ether-highlight");
this._highlightDiv.style.position="absolute";
this._highlightDiv.style.background=D.ether.highlightColor;
var F=D.ether.highlightOpacity;
if(F<100){SimileAjax.Graphics.setOpacity(this._highlightDiv,F);
}B.appendChild(this._highlightDiv);
}};
this.position=function(F,I){this._createHighlightDiv();
var J=Math.round(E.dateToPixelOffset(F));
var H=Math.round(E.dateToPixelOffset(I));
var G=Math.max(H-J,3);
if(A){this._highlightDiv.style.left=J+"px";
this._highlightDiv.style.width=G+"px";
this._highlightDiv.style.top="2px";
this._highlightDiv.style.height=(E.getViewWidth()-4)+"px";
}else{this._highlightDiv.style.top=J+"px";
this._highlightDiv.style.height=G+"px";
this._highlightDiv.style.left="2px";
this._highlightDiv.style.width=(E.getViewWidth()-4)+"px";
}};
};


/* ethers.js */
Timeline.LinearEther=function(A){this._params=A;
this._interval=A.interval;
this._pixelsPerInterval=A.pixelsPerInterval;
};
Timeline.LinearEther.prototype.initialize=function(A){this._timeline=A;
this._unit=A.getUnit();
if("startsOn" in this._params){this._start=this._unit.parseFromObject(this._params.startsOn);
}else{if("endsOn" in this._params){this._start=this._unit.parseFromObject(this._params.endsOn);
this.shiftPixels(-this._timeline.getPixelLength());
}else{if("centersOn" in this._params){this._start=this._unit.parseFromObject(this._params.centersOn);
this.shiftPixels(-this._timeline.getPixelLength()/2);
}else{this._start=this._unit.makeDefaultValue();
this.shiftPixels(-this._timeline.getPixelLength()/2);
}}}};
Timeline.LinearEther.prototype.setDate=function(A){this._start=this._unit.cloneValue(A);
};
Timeline.LinearEther.prototype.shiftPixels=function(B){var A=this._interval*B/this._pixelsPerInterval;
this._start=this._unit.change(this._start,A);
};
Timeline.LinearEther.prototype.dateToPixelOffset=function(A){var B=this._unit.compare(A,this._start);
return this._pixelsPerInterval*B/this._interval;
};
Timeline.LinearEther.prototype.pixelOffsetToDate=function(B){var A=B*this._interval/this._pixelsPerInterval;
return this._unit.change(this._start,A);
};
Timeline.HotZoneEther=function(A){this._params=A;
this._interval=A.interval;
this._pixelsPerInterval=A.pixelsPerInterval;
};
Timeline.HotZoneEther.prototype.initialize=function(G){this._timeline=G;
this._unit=G.getUnit();
this._zones=[{startTime:Number.NEGATIVE_INFINITY,endTime:Number.POSITIVE_INFINITY,magnify:1}];
var H=this._params;
for(var E=0;
E<H.zones.length;
E++){var B=H.zones[E];
var D=this._unit.parseFromObject(B.start);
var F=this._unit.parseFromObject(B.end);
for(var C=0;
C<this._zones.length&&this._unit.compare(F,D)>0;
C++){var A=this._zones[C];
if(this._unit.compare(D,A.endTime)<0){if(this._unit.compare(D,A.startTime)>0){this._zones.splice(C,0,{startTime:A.startTime,endTime:D,magnify:A.magnify});
C++;
A.startTime=D;
}if(this._unit.compare(F,A.endTime)<0){this._zones.splice(C,0,{startTime:D,endTime:F,magnify:B.magnify*A.magnify});
C++;
A.startTime=F;
D=F;
}else{A.magnify*=B.magnify;
D=A.endTime;
}}}}if("startsOn" in this._params){this._start=this._unit.parseFromObject(this._params.startsOn);
}else{if("endsOn" in this._params){this._start=this._unit.parseFromObject(this._params.endsOn);
this.shiftPixels(-this._timeline.getPixelLength());
}else{if("centersOn" in this._params){this._start=this._unit.parseFromObject(this._params.centersOn);
this.shiftPixels(-this._timeline.getPixelLength()/2);
}else{this._start=this._unit.makeDefaultValue();
this.shiftPixels(-this._timeline.getPixelLength()/2);
}}}};
Timeline.HotZoneEther.prototype.setDate=function(A){this._start=this._unit.cloneValue(A);
};
Timeline.HotZoneEther.prototype.shiftPixels=function(A){this._start=this.pixelOffsetToDate(A);
};
Timeline.HotZoneEther.prototype.dateToPixelOffset=function(A){return this._dateDiffToPixelOffset(this._start,A);
};
Timeline.HotZoneEther.prototype.pixelOffsetToDate=function(A){return this._pixelOffsetToDate(A,this._start);
};
Timeline.HotZoneEther.prototype._dateDiffToPixelOffset=function(I,D){var B=this._getScale();
var H=I;
var C=D;
var A=0;
if(this._unit.compare(H,C)<0){var G=0;
while(G<this._zones.length){if(this._unit.compare(H,this._zones[G].endTime)<0){break;
}G++;
}while(this._unit.compare(H,C)<0){var E=this._zones[G];
var F=this._unit.earlier(C,E.endTime);
A+=(this._unit.compare(F,H)/(B/E.magnify));
H=F;
G++;
}}else{var G=this._zones.length-1;
while(G>=0){if(this._unit.compare(H,this._zones[G].startTime)>0){break;
}G--;
}while(this._unit.compare(H,C)>0){var E=this._zones[G];
var F=this._unit.later(C,E.startTime);
A+=(this._unit.compare(F,H)/(B/E.magnify));
H=F;
G--;
}}return A;
};
Timeline.HotZoneEther.prototype._pixelOffsetToDate=function(H,C){var G=this._getScale();
var E=C;
if(H>0){var F=0;
while(F<this._zones.length){if(this._unit.compare(E,this._zones[F].endTime)<0){break;
}F++;
}while(H>0){var A=this._zones[F];
var D=G/A.magnify;
if(A.endTime==Number.POSITIVE_INFINITY){E=this._unit.change(E,H*D);
H=0;
}else{var B=this._unit.compare(A.endTime,E)/D;
if(B>H){E=this._unit.change(E,H*D);
H=0;
}else{E=A.endTime;
H-=B;
}}F++;
}}else{var F=this._zones.length-1;
while(F>=0){if(this._unit.compare(E,this._zones[F].startTime)>0){break;
}F--;
}H=-H;
while(H>0){var A=this._zones[F];
var D=G/A.magnify;
if(A.startTime==Number.NEGATIVE_INFINITY){E=this._unit.change(E,-H*D);
H=0;
}else{var B=this._unit.compare(E,A.startTime)/D;
if(B>H){E=this._unit.change(E,-H*D);
H=0;
}else{E=A.startTime;
H-=B;
}}F--;
}}return E;
};
Timeline.HotZoneEther.prototype._getScale=function(){return this._interval/this._pixelsPerInterval;
};


/* labellers.js */
Timeline.GregorianDateLabeller=function(A,B){this._locale=A;
this._timeZone=B;
};
Timeline.GregorianDateLabeller.monthNames=[];
Timeline.GregorianDateLabeller.dayNames=[];
Timeline.GregorianDateLabeller.labelIntervalFunctions=[];
Timeline.GregorianDateLabeller.getMonthName=function(B,A){return Timeline.GregorianDateLabeller.monthNames[A][B];
};
Timeline.GregorianDateLabeller.prototype.labelInterval=function(A,C){var B=Timeline.GregorianDateLabeller.labelIntervalFunctions[this._locale];
if(B==null){B=Timeline.GregorianDateLabeller.prototype.defaultLabelInterval;
}return B.call(this,A,C);
};
Timeline.GregorianDateLabeller.prototype.labelPrecise=function(A){return SimileAjax.DateTime.removeTimeZoneOffset(A,this._timeZone).toUTCString();
};
Timeline.GregorianDateLabeller.prototype.defaultLabelInterval=function(B,F){var C;
var E=false;
B=SimileAjax.DateTime.removeTimeZoneOffset(B,this._timeZone);
switch(F){case SimileAjax.DateTime.MILLISECOND:C=B.getUTCMilliseconds();
break;
case SimileAjax.DateTime.SECOND:C=B.getUTCSeconds();
break;
case SimileAjax.DateTime.MINUTE:var A=B.getUTCMinutes();
if(A==0){C=B.getUTCHours()+":00";
E=true;
}else{C=A;
}break;
case SimileAjax.DateTime.HOUR:C=B.getUTCHours()+"hr";
break;
case SimileAjax.DateTime.DAY:C=Timeline.GregorianDateLabeller.getMonthName(B.getUTCMonth(),this._locale)+" "+B.getUTCDate();
break;
case SimileAjax.DateTime.WEEK:C=Timeline.GregorianDateLabeller.getMonthName(B.getUTCMonth(),this._locale)+" "+B.getUTCDate();
break;
case SimileAjax.DateTime.MONTH:var A=B.getUTCMonth();
if(A!=0){C=Timeline.GregorianDateLabeller.getMonthName(A,this._locale);
break;
}case SimileAjax.DateTime.YEAR:case SimileAjax.DateTime.DECADE:case SimileAjax.DateTime.CENTURY:case SimileAjax.DateTime.MILLENNIUM:var D=B.getUTCFullYear();
if(D>0){C=B.getUTCFullYear();
}else{C=(1-D)+"BC";
}E=(F==SimileAjax.DateTime.MONTH)||(F==SimileAjax.DateTime.DECADE&&D%100==0)||(F==SimileAjax.DateTime.CENTURY&&D%1000==0);
break;
default:C=B.toUTCString();
}return{text:C,emphasized:E};
};


/* original-painter.js */
Timeline.OriginalEventPainter=function(A){this._params=A;
this._onSelectListeners=[];
this._filterMatcher=null;
this._highlightMatcher=null;
this._frc=null;
this._eventIdToElmt={};
};
Timeline.OriginalEventPainter.prototype.initialize=function(B,A){this._band=B;
this._timeline=A;
this._backLayer=null;
this._eventLayer=null;
this._lineLayer=null;
this._highlightLayer=null;
this._eventIdToElmt=null;
};
Timeline.OriginalEventPainter.prototype.addOnSelectListener=function(A){this._onSelectListeners.push(A);
};
Timeline.OriginalEventPainter.prototype.removeOnSelectListener=function(B){for(var A=0;
A<this._onSelectListeners.length;
A++){if(this._onSelectListeners[A]==B){this._onSelectListeners.splice(A,1);
break;
}}};
Timeline.OriginalEventPainter.prototype.getFilterMatcher=function(){return this._filterMatcher;
};
Timeline.OriginalEventPainter.prototype.setFilterMatcher=function(A){this._filterMatcher=A;
};
Timeline.OriginalEventPainter.prototype.getHighlightMatcher=function(){return this._highlightMatcher;
};
Timeline.OriginalEventPainter.prototype.setHighlightMatcher=function(A){this._highlightMatcher=A;
};
Timeline.OriginalEventPainter.prototype.paint=function(){var B=this._band.getEventSource();
if(B==null){return ;
}this._eventIdToElmt={};
this._prepareForPainting();
var I=this._params.theme.event;
var G=Math.max(I.track.height,I.tape.height+this._frc.getLineHeight());
var F={trackOffset:I.track.gap,trackHeight:G,trackGap:I.track.gap,trackIncrement:G+I.track.gap,icon:I.instant.icon,iconWidth:I.instant.iconWidth,iconHeight:I.instant.iconHeight,labelWidth:I.label.width};
var C=this._band.getMinDate();
var A=this._band.getMaxDate();
var J=(this._filterMatcher!=null)?this._filterMatcher:function(K){return true;
};
var E=(this._highlightMatcher!=null)?this._highlightMatcher:function(K){return -1;
};
var D=B.getEventReverseIterator(C,A);
while(D.hasNext()){var H=D.next();
if(J(H)){this.paintEvent(H,F,this._params.theme,E(H));
}}this._highlightLayer.style.display="block";
this._lineLayer.style.display="block";
this._eventLayer.style.display="block";
};
Timeline.OriginalEventPainter.prototype.softPaint=function(){};
Timeline.OriginalEventPainter.prototype._prepareForPainting=function(){var B=this._band;
if(this._backLayer==null){this._backLayer=this._band.createLayerDiv(0,"timeline-band-events");
this._backLayer.style.visibility="hidden";
var A=document.createElement("span");
A.className="timeline-event-label";
this._backLayer.appendChild(A);
this._frc=SimileAjax.Graphics.getFontRenderingContext(A);
}this._frc.update();
this._tracks=[];
if(this._highlightLayer!=null){B.removeLayerDiv(this._highlightLayer);
}this._highlightLayer=B.createLayerDiv(105,"timeline-band-highlights");
this._highlightLayer.style.display="none";
if(this._lineLayer!=null){B.removeLayerDiv(this._lineLayer);
}this._lineLayer=B.createLayerDiv(110,"timeline-band-lines");
this._lineLayer.style.display="none";
if(this._eventLayer!=null){B.removeLayerDiv(this._eventLayer);
}this._eventLayer=B.createLayerDiv(115,"timeline-band-events");
this._eventLayer.style.display="none";
};
Timeline.OriginalEventPainter.prototype.paintEvent=function(B,C,D,A){if(B.isInstant()){this.paintInstantEvent(B,C,D,A);
}else{this.paintDurationEvent(B,C,D,A);
}};
Timeline.OriginalEventPainter.prototype.paintInstantEvent=function(B,C,D,A){if(B.isImprecise()){this.paintImpreciseInstantEvent(B,C,D,A);
}else{this.paintPreciseInstantEvent(B,C,D,A);
}};
Timeline.OriginalEventPainter.prototype.paintDurationEvent=function(B,C,D,A){if(B.isImprecise()){this.paintImpreciseDurationEvent(B,C,D,A);
}else{this.paintPreciseDurationEvent(B,C,D,A);
}};
Timeline.OriginalEventPainter.prototype.paintPreciseInstantEvent=function(J,N,P,O){var S=this._timeline.getDocument();
var I=J.getText();
var E=J.getStart();
var C=Math.round(this._band.dateToPixelOffset(E));
var A=Math.round(C+N.iconWidth/2);
var H=Math.round(C-N.iconWidth/2);
var F=this._frc.computeSize(I);
var T=A+P.event.label.offsetFromLine;
var D=T+F.width;
var R=D;
var L=this._findFreeTrack(R);
var Q=Math.round(N.trackOffset+L*N.trackIncrement+N.trackHeight/2-F.height/2);
var B=this._paintEventIcon(J,L,H,N,P);
var M=this._paintEventLabel(J,I,T,Q,F.width,F.height,P);
var K=this;
var G=function(U,V,W){return K._onClickInstantEvent(B.elmt,V,J);
};
SimileAjax.DOM.registerEvent(B.elmt,"mousedown",G);
SimileAjax.DOM.registerEvent(M.elmt,"mousedown",G);
this._createHighlightDiv(O,B,P);
this._eventIdToElmt[J.getID()]=B.elmt;
this._tracks[L]=H;
};
Timeline.OriginalEventPainter.prototype.paintImpreciseInstantEvent=function(L,P,T,Q){var V=this._timeline.getDocument();
var K=L.getText();
var G=L.getStart();
var R=L.getEnd();
var D=Math.round(this._band.dateToPixelOffset(G));
var B=Math.round(this._band.dateToPixelOffset(R));
var A=Math.round(D+P.iconWidth/2);
var J=Math.round(D-P.iconWidth/2);
var H=this._frc.computeSize(K);
var W=A+T.event.label.offsetFromLine;
var E=W+H.width;
var U=Math.max(E,B);
var N=this._findFreeTrack(U);
var S=Math.round(P.trackOffset+N*P.trackIncrement+P.trackHeight/2-H.height/2);
var C=this._paintEventIcon(L,N,J,P,T);
var O=this._paintEventLabel(L,K,W,S,H.width,H.height,T);
var F=this._paintEventTape(L,N,D,B,T.event.instant.impreciseColor,T.event.instant.impreciseOpacity,P,T);
var M=this;
var I=function(X,Y,Z){return M._onClickInstantEvent(C.elmt,Y,L);
};
SimileAjax.DOM.registerEvent(C.elmt,"mousedown",I);
SimileAjax.DOM.registerEvent(F.elmt,"mousedown",I);
SimileAjax.DOM.registerEvent(O.elmt,"mousedown",I);
this._createHighlightDiv(Q,C,T);
this._eventIdToElmt[L.getID()]=C.elmt;
this._tracks[N]=J;
};
Timeline.OriginalEventPainter.prototype.paintPreciseDurationEvent=function(I,M,Q,O){var T=this._timeline.getDocument();
var H=I.getText();
var E=I.getStart();
var P=I.getEnd();
var B=Math.round(this._band.dateToPixelOffset(E));
var A=Math.round(this._band.dateToPixelOffset(P));
var F=this._frc.computeSize(H);
var U=B;
var C=U+F.width;
var S=Math.max(C,A);
var K=this._findFreeTrack(S);
var R=Math.round(M.trackOffset+K*M.trackIncrement+Q.event.tape.height);
var N=I.getColor();
N=N!=null?N:Q.event.duration.color;
var D=this._paintEventTape(I,K,B,A,N,100,M,Q);
var L=this._paintEventLabel(I,H,U,R,F.width,F.height,Q);
var J=this;
var G=function(V,W,X){return J._onClickDurationEvent(D.elmt,W,I);
};
SimileAjax.DOM.registerEvent(D.elmt,"mousedown",G);
SimileAjax.DOM.registerEvent(L.elmt,"mousedown",G);
this._createHighlightDiv(O,D,Q);
this._eventIdToElmt[I.getID()]=D.elmt;
this._tracks[K]=B;
};
Timeline.OriginalEventPainter.prototype.paintImpreciseDurationEvent=function(K,P,V,S){var Y=this._timeline.getDocument();
var J=K.getText();
var E=K.getStart();
var Q=K.getLatestStart();
var T=K.getEnd();
var X=K.getEarliestEnd();
var B=Math.round(this._band.dateToPixelOffset(E));
var F=Math.round(this._band.dateToPixelOffset(Q));
var A=Math.round(this._band.dateToPixelOffset(T));
var G=Math.round(this._band.dateToPixelOffset(X));
var H=this._frc.computeSize(J);
var Z=F;
var C=Z+H.width;
var W=Math.max(C,A);
var M=this._findFreeTrack(W);
var U=Math.round(P.trackOffset+M*P.trackIncrement+V.event.tape.height);
var R=K.getColor();
R=R!=null?R:V.event.duration.color;
var O=this._paintEventTape(K,M,B,A,V.event.duration.impreciseColor,V.event.duration.impreciseOpacity,P,V);
var D=this._paintEventTape(K,M,F,G,R,100,P,V);
var N=this._paintEventLabel(K,J,Z,U,H.width,H.height,V);
var L=this;
var I=function(a,b,c){return L._onClickDurationEvent(D.elmt,b,K);
};
SimileAjax.DOM.registerEvent(D.elmt,"mousedown",I);
SimileAjax.DOM.registerEvent(N.elmt,"mousedown",I);
this._createHighlightDiv(S,D,V);
this._eventIdToElmt[K.getID()]=D.elmt;
this._tracks[M]=B;
};
Timeline.OriginalEventPainter.prototype._findFreeTrack=function(A){for(var C=0;
C<this._tracks.length;
C++){var B=this._tracks[C];
if(B>A){break;
}}return C;
};
Timeline.OriginalEventPainter.prototype._paintEventIcon=function(I,E,B,F,D){var H=I.getIcon();
H=H!=null?H:F.icon;
var J=F.trackOffset+E*F.trackIncrement+F.trackHeight/2;
var G=Math.round(J-F.iconHeight/2);
var C=SimileAjax.Graphics.createTranslucentImage(H);
var A=this._timeline.getDocument().createElement("div");
A.style.position="absolute";
A.style.left=B+"px";
A.style.top=G+"px";
A.appendChild(C);
A.style.cursor="pointer";
this._eventLayer.appendChild(A);
return{left:B,top:G,width:F.iconWidth,height:F.iconHeight,elmt:A};
};
Timeline.OriginalEventPainter.prototype._paintEventLabel=function(H,I,B,F,A,J,D){var G=this._timeline.getDocument();
var E=G.createElement("div");
E.style.position="absolute";
E.style.left=B+"px";
E.style.width=A+"px";
E.style.top=F+"px";
E.innerHTML=I;
E.style.cursor="pointer";
var C=H.getTextColor();
if(C==null){C=H.getColor();
}if(C!=null){E.style.color=C;
}this._eventLayer.appendChild(E);
return{left:B,top:F,width:A,height:J,elmt:E};
};
Timeline.OriginalEventPainter.prototype._paintEventTape=function(L,H,E,A,C,G,I,F){var B=A-E;
var D=F.event.tape.height;
var J=I.trackOffset+H*I.trackIncrement;
var K=this._timeline.getDocument().createElement("div");
K.style.position="absolute";
K.style.left=E+"px";
K.style.width=B+"px";
K.style.top=J+"px";
K.style.height=D+"px";
K.style.backgroundColor=C;
K.style.overflow="hidden";
K.style.cursor="pointer";
SimileAjax.Graphics.setOpacity(K,G);
this._eventLayer.appendChild(K);
return{left:E,top:J,width:B,height:D,elmt:K};
};
Timeline.OriginalEventPainter.prototype._createHighlightDiv=function(A,C,E){if(A>=0){var D=this._timeline.getDocument();
var G=E.event;
var B=G.highlightColors[Math.min(A,G.highlightColors.length-1)];
var F=D.createElement("div");
F.style.position="absolute";
F.style.overflow="hidden";
F.style.left=(C.left-2)+"px";
F.style.width=(C.width+4)+"px";
F.style.top=(C.top-2)+"px";
F.style.height=(C.height+4)+"px";
F.style.background=B;
this._highlightLayer.appendChild(F);
}};
Timeline.OriginalEventPainter.prototype._onClickInstantEvent=function(B,C,A){var D=SimileAjax.DOM.getPageCoordinates(B);
this._showBubble(D.left+Math.ceil(B.offsetWidth/2),D.top+Math.ceil(B.offsetHeight/2),A);
this._fireOnSelect(A.getID());
C.cancelBubble=true;
SimileAjax.DOM.cancelEvent(C);
return false;
};
Timeline.OriginalEventPainter.prototype._onClickDurationEvent=function(D,C,B){if("pageX" in C){var A=C.pageX;
var F=C.pageY;
}else{var E=SimileAjax.DOM.getPageCoordinates(D);
var A=C.offsetX+E.left;
var F=C.offsetY+E.top;
}this._showBubble(A,F,B);
this._fireOnSelect(B.getID());
C.cancelBubble=true;
SimileAjax.DOM.cancelEvent(C);
return false;
};
Timeline.OriginalEventPainter.prototype.showBubble=function(A){var B=this._eventIdToElmt[A.getID()];
if(B){var C=SimileAjax.DOM.getPageCoordinates(B);
this._showBubble(C.left+B.offsetWidth/2,C.top+B.offsetHeight/2,A);
}};
Timeline.OriginalEventPainter.prototype._showBubble=function(A,D,B){var C=document.createElement("div");
B.fillInfoBubble(C,this._params.theme,this._band.getLabeller());
SimileAjax.WindowManager.cancelPopups();
SimileAjax.Graphics.createBubbleForContentAndPoint(C,A,D,this._params.theme.event.bubble.width);
};
Timeline.OriginalEventPainter.prototype._fireOnSelect=function(B){for(var A=0;
A<this._onSelectListeners.length;
A++){this._onSelectListeners[A](B);
}};


/* overview-painter.js */
Timeline.OverviewEventPainter=function(A){this._params=A;
this._onSelectListeners=[];
this._filterMatcher=null;
this._highlightMatcher=null;
};
Timeline.OverviewEventPainter.prototype.initialize=function(B,A){this._band=B;
this._timeline=A;
this._eventLayer=null;
this._highlightLayer=null;
};
Timeline.OverviewEventPainter.prototype.addOnSelectListener=function(A){this._onSelectListeners.push(A);
};
Timeline.OverviewEventPainter.prototype.removeOnSelectListener=function(B){for(var A=0;
A<this._onSelectListeners.length;
A++){if(this._onSelectListeners[A]==B){this._onSelectListeners.splice(A,1);
break;
}}};
Timeline.OverviewEventPainter.prototype.getFilterMatcher=function(){return this._filterMatcher;
};
Timeline.OverviewEventPainter.prototype.setFilterMatcher=function(A){this._filterMatcher=A;
};
Timeline.OverviewEventPainter.prototype.getHighlightMatcher=function(){return this._highlightMatcher;
};
Timeline.OverviewEventPainter.prototype.setHighlightMatcher=function(A){this._highlightMatcher=A;
};
Timeline.OverviewEventPainter.prototype.paint=function(){var B=this._band.getEventSource();
if(B==null){return ;
}this._prepareForPainting();
var H=this._params.theme.event;
var F={trackOffset:H.overviewTrack.offset,trackHeight:H.overviewTrack.height,trackGap:H.overviewTrack.gap,trackIncrement:H.overviewTrack.height+H.overviewTrack.gap};
var C=this._band.getMinDate();
var A=this._band.getMaxDate();
var I=(this._filterMatcher!=null)?this._filterMatcher:function(J){return true;
};
var E=(this._highlightMatcher!=null)?this._highlightMatcher:function(J){return -1;
};
var D=B.getEventReverseIterator(C,A);
while(D.hasNext()){var G=D.next();
if(I(G)){this.paintEvent(G,F,this._params.theme,E(G));
}}this._highlightLayer.style.display="block";
this._eventLayer.style.display="block";
};
Timeline.OverviewEventPainter.prototype.softPaint=function(){};
Timeline.OverviewEventPainter.prototype._prepareForPainting=function(){var A=this._band;
this._tracks=[];
if(this._highlightLayer!=null){A.removeLayerDiv(this._highlightLayer);
}this._highlightLayer=A.createLayerDiv(105,"timeline-band-highlights");
this._highlightLayer.style.display="none";
if(this._eventLayer!=null){A.removeLayerDiv(this._eventLayer);
}this._eventLayer=A.createLayerDiv(110,"timeline-band-events");
this._eventLayer.style.display="none";
};
Timeline.OverviewEventPainter.prototype.paintEvent=function(B,C,D,A){if(B.isInstant()){this.paintInstantEvent(B,C,D,A);
}else{this.paintDurationEvent(B,C,D,A);
}};
Timeline.OverviewEventPainter.prototype.paintInstantEvent=function(C,F,G,B){var A=C.getStart();
var H=Math.round(this._band.dateToPixelOffset(A));
var D=C.getColor();
D=D!=null?D:G.event.duration.color;
var E=this._paintEventTick(C,H,D,100,F,G);
this._createHighlightDiv(B,E,G);
};
Timeline.OverviewEventPainter.prototype.paintDurationEvent=function(K,J,I,D){var A=K.getLatestStart();
var C=K.getEarliestEnd();
var B=Math.round(this._band.dateToPixelOffset(A));
var E=Math.round(this._band.dateToPixelOffset(C));
var H=0;
for(;
H<this._tracks.length;
H++){if(E<this._tracks[H]){break;
}}this._tracks[H]=E;
var G=K.getColor();
G=G!=null?G:I.event.duration.color;
var F=this._paintEventTape(K,H,B,E,G,100,J,I);
this._createHighlightDiv(D,F,I);
};
Timeline.OverviewEventPainter.prototype._paintEventTape=function(K,B,C,J,D,F,G,E){var H=G.trackOffset+B*G.trackIncrement;
var A=J-C;
var L=G.trackHeight;
var I=this._timeline.getDocument().createElement("div");
I.style.position="absolute";
I.style.left=C+"px";
I.style.width=A+"px";
I.style.top=H+"px";
I.style.height=L+"px";
I.style.backgroundColor=D;
I.style.overflow="hidden";
SimileAjax.Graphics.setOpacity(I,F);
this._eventLayer.appendChild(I);
return{left:C,top:H,width:A,height:L,elmt:I};
};
Timeline.OverviewEventPainter.prototype._paintEventTick=function(I,B,C,E,F,D){var J=D.event.overviewTrack.tickHeight;
var G=F.trackOffset-J;
var A=1;
var H=this._timeline.getDocument().createElement("div");
H.style.position="absolute";
H.style.left=B+"px";
H.style.width=A+"px";
H.style.top=G+"px";
H.style.height=J+"px";
H.style.backgroundColor=C;
H.style.overflow="hidden";
SimileAjax.Graphics.setOpacity(H,E);
this._eventLayer.appendChild(H);
return{left:B,top:G,width:A,height:J,elmt:H};
};
Timeline.OverviewEventPainter.prototype._createHighlightDiv=function(A,C,E){if(A>=0){var D=this._timeline.getDocument();
var G=E.event;
var B=G.highlightColors[Math.min(A,G.highlightColors.length-1)];
var F=D.createElement("div");
F.style.position="absolute";
F.style.overflow="hidden";
F.style.left=(C.left-1)+"px";
F.style.width=(C.width+2)+"px";
F.style.top=(C.top-1)+"px";
F.style.height=(C.height+2)+"px";
F.style.background=B;
this._highlightLayer.appendChild(F);
}};
Timeline.OverviewEventPainter.prototype.showBubble=function(A){};


/* sources.js */
Timeline.DefaultEventSource=function(A){this._events=(A instanceof Object)?A:new SimileAjax.EventIndex();
this._listeners=[];
};
Timeline.DefaultEventSource.prototype.addListener=function(A){this._listeners.push(A);
};
Timeline.DefaultEventSource.prototype.removeListener=function(B){for(var A=0;
A<this._listeners.length;
A++){if(this._listeners[A]==B){this._listeners.splice(A,1);
break;
}}};
Timeline.DefaultEventSource.prototype.loadXML=function(F,A){var B=this._getBaseURL(A);
var G=F.documentElement.getAttribute("wiki-url");
var K=F.documentElement.getAttribute("wiki-section");
var D=F.documentElement.getAttribute("date-time-format");
var E=this._events.getUnit().getParser(D);
var C=F.documentElement.firstChild;
var H=false;
while(C!=null){if(C.nodeType==1){var J="";
if(C.firstChild!=null&&C.firstChild.nodeType==3){J=C.firstChild.nodeValue;
}var I=new Timeline.DefaultEventSource.Event(C.getAttribute("id"),E(C.getAttribute("start")),E(C.getAttribute("end")),E(C.getAttribute("latestStart")),E(C.getAttribute("earliestEnd")),C.getAttribute("isDuration")!="true",C.getAttribute("title"),J,this._resolveRelativeURL(C.getAttribute("image"),B),this._resolveRelativeURL(C.getAttribute("link"),B),this._resolveRelativeURL(C.getAttribute("icon"),B),C.getAttribute("color"),C.getAttribute("textColor"));
I._node=C;
I.getProperty=function(L){return this._node.getAttribute(L);
};
I.setWikiInfo(G,K);
this._events.add(I);
H=true;
}C=C.nextSibling;
}if(H){this._fire("onAddMany",[]);
}};
Timeline.DefaultEventSource.prototype.loadJSON=function(F,B){var C=this._getBaseURL(B);
var I=false;
if(F&&F.events){var H=("wikiURL" in F)?F.wikiURL:null;
var K=("wikiSection" in F)?F.wikiSection:null;
var D=("dateTimeFormat" in F)?F.dateTimeFormat:null;
var G=this._events.getUnit().getParser(D);
for(var E=0;
E<F.events.length;
E++){var A=F.events[E];
var J=new Timeline.DefaultEventSource.Event(("id" in A)?A.id:undefined,G(A.start),G(A.end),G(A.latestStart),G(A.earliestEnd),A.isDuration||false,A.title,A.description,this._resolveRelativeURL(A.image,C),this._resolveRelativeURL(A.link,C),this._resolveRelativeURL(A.icon,C),A.color,A.textColor);
J._obj=A;
J.getProperty=function(L){return this._obj[L];
};
J.setWikiInfo(H,K);
this._events.add(J);
I=true;
}}if(I){this._fire("onAddMany",[]);
}};
Timeline.DefaultEventSource.prototype.loadSPARQL=function(G,A){var C=this._getBaseURL(A);
var E="iso8601";
var F=this._events.getUnit().getParser(E);
if(G==null){return ;
}var D=G.documentElement.firstChild;
while(D!=null&&(D.nodeType!=1||D.nodeName!="results")){D=D.nextSibling;
}var I=null;
var L=null;
if(D!=null){I=D.getAttribute("wiki-url");
L=D.getAttribute("wiki-section");
D=D.firstChild;
}var J=false;
while(D!=null){if(D.nodeType==1){var B={};
var H=D.firstChild;
while(H!=null){if(H.nodeType==1&&H.firstChild!=null&&H.firstChild.nodeType==1&&H.firstChild.firstChild!=null&&H.firstChild.firstChild.nodeType==3){B[H.getAttribute("name")]=H.firstChild.firstChild.nodeValue;
}H=H.nextSibling;
}if(B["start"]==null&&B["date"]!=null){B["start"]=B["date"];
}var K=new Timeline.DefaultEventSource.Event(B["id"],F(B["start"]),F(B["end"]),F(B["latestStart"]),F(B["earliestEnd"]),B["isDuration"]!="true",B["title"],B["description"],this._resolveRelativeURL(B["image"],C),this._resolveRelativeURL(B["link"],C),this._resolveRelativeURL(B["icon"],C),B["color"],B["textColor"]);
K._bindings=B;
K.getProperty=function(M){return this._bindings[M];
};
K.setWikiInfo(I,L);
this._events.add(K);
J=true;
}D=D.nextSibling;
}if(J){this._fire("onAddMany",[]);
}};
Timeline.DefaultEventSource.prototype.add=function(A){this._events.add(A);
this._fire("onAddOne",[A]);
};
Timeline.DefaultEventSource.prototype.addMany=function(B){for(var A=0;
A<B.length;
A++){this._events.add(B[A]);
}this._fire("onAddMany",[]);
};
Timeline.DefaultEventSource.prototype.clear=function(){this._events.removeAll();
this._fire("onClear",[]);
};
Timeline.DefaultEventSource.prototype.getEvent=function(A){return this._events.getEvent(A);
};
Timeline.DefaultEventSource.prototype.getEventIterator=function(A,B){return this._events.getIterator(A,B);
};
Timeline.DefaultEventSource.prototype.getEventReverseIterator=function(A,B){return this._events.getReverseIterator(A,B);
};
Timeline.DefaultEventSource.prototype.getAllEventIterator=function(){return this._events.getAllIterator();
};
Timeline.DefaultEventSource.prototype.getCount=function(){return this._events.getCount();
};
Timeline.DefaultEventSource.prototype.getEarliestDate=function(){return this._events.getEarliestDate();
};
Timeline.DefaultEventSource.prototype.getLatestDate=function(){return this._events.getLatestDate();
};
Timeline.DefaultEventSource.prototype._fire=function(B,A){for(var C=0;
C<this._listeners.length;
C++){var D=this._listeners[C];
if(B in D){try{D[B].apply(D,A);
}catch(E){SimileAjax.Debug.exception(E);
}}}};
Timeline.DefaultEventSource.prototype._getBaseURL=function(A){if(A.indexOf("://")<0){var C=this._getBaseURL(document.location.href);
if(A.substr(0,1)=="/"){A=C.substr(0,C.indexOf("/",C.indexOf("://")+3))+A;
}else{A=C+A;
}}var B=A.lastIndexOf("/");
if(B<0){return"";
}else{return A.substr(0,B+1);
}};
Timeline.DefaultEventSource.prototype._resolveRelativeURL=function(A,B){if(A==null||A==""){return A;
}else{if(A.indexOf("://")>0){return A;
}else{if(A.substr(0,1)=="/"){return B.substr(0,B.indexOf("/",B.indexOf("://")+3))+A;
}else{return B+A;
}}}};
Timeline.DefaultEventSource.Event=function(A,B,F,H,G,C,M,L,D,J,I,E,K){A=(A)?A.trim():"";
this._id=A.length>0?A:("e"+Math.floor(Math.random()*1000000));
this._instant=C||(F==null);
this._start=B;
this._end=(F!=null)?F:B;
this._latestStart=(H!=null)?H:(C?this._end:this._start);
this._earliestEnd=(G!=null)?G:(C?this._start:this._end);
this._text=SimileAjax.HTML.deEntify(M);
this._description=SimileAjax.HTML.deEntify(L);
this._image=(D!=null&&D!="")?D:null;
this._link=(J!=null&&J!="")?J:null;
this._icon=(I!=null&&I!="")?I:null;
this._color=(E!=null&&E!="")?E:null;
this._textColor=(K!=null&&K!="")?K:null;
this._wikiURL=null;
this._wikiSection=null;
};
Timeline.DefaultEventSource.Event.prototype={getID:function(){return this._id;
},isInstant:function(){return this._instant;
},isImprecise:function(){return this._start!=this._latestStart||this._end!=this._earliestEnd;
},getStart:function(){return this._start;
},getEnd:function(){return this._end;
},getLatestStart:function(){return this._latestStart;
},getEarliestEnd:function(){return this._earliestEnd;
},getText:function(){return this._text;
},getDescription:function(){return this._description;
},getImage:function(){return this._image;
},getLink:function(){return this._link;
},getIcon:function(){return this._icon;
},getColor:function(){return this._color;
},getTextColor:function(){return this._textColor;
},getProperty:function(A){return null;
},getWikiURL:function(){return this._wikiURL;
},getWikiSection:function(){return this._wikiSection;
},setWikiInfo:function(B,A){this._wikiURL=B;
this._wikiSection=A;
},fillDescription:function(A){A.innerHTML=this._description;
},fillWikiInfo:function(D){if(this._wikiURL!=null&&this._wikiSection!=null){var C=this.getProperty("wikiID");
if(C==null||C.length==0){C=this.getText();
}C=C.replace(/\s/g,"_");
var B=this._wikiURL+this._wikiSection.replace(/\s/g,"_")+"/"+C;
var A=document.createElement("a");
A.href=B;
A.target="new";
A.innerHTML=Timeline.strings[Timeline.clientLocale].wikiLinkLabel;
D.appendChild(document.createTextNode("["));
D.appendChild(A);
D.appendChild(document.createTextNode("]"));
}else{D.style.display="none";
}},fillTime:function(A,B){if(this._instant){if(this.isImprecise()){A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._start)));
A.appendChild(A.ownerDocument.createElement("br"));
A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._end)));
}else{A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._start)));
}}else{if(this.isImprecise()){A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._start)+" ~ "+B.labelPrecise(this._latestStart)));
A.appendChild(A.ownerDocument.createElement("br"));
A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._earliestEnd)+" ~ "+B.labelPrecise(this._end)));
}else{A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._start)));
A.appendChild(A.ownerDocument.createElement("br"));
A.appendChild(A.ownerDocument.createTextNode(B.labelPrecise(this._end)));
}}},fillInfoBubble:function(A,D,K){var L=A.ownerDocument;
var J=this.getText();
var H=this.getLink();
var C=this.getImage();
if(C!=null){var E=L.createElement("img");
E.src=C;
D.event.bubble.imageStyler(E);
A.appendChild(E);
}var M=L.createElement("div");
var B=L.createTextNode(J);
if(H!=null){var I=L.createElement("a");
I.href=H;
I.appendChild(B);
M.appendChild(I);
}else{M.appendChild(B);
}D.event.bubble.titleStyler(M);
A.appendChild(M);
var N=L.createElement("div");
this.fillDescription(N);
D.event.bubble.bodyStyler(N);
A.appendChild(N);
var G=L.createElement("div");
this.fillTime(G,K);
D.event.bubble.timeStyler(G);
A.appendChild(G);
var F=L.createElement("div");
this.fillWikiInfo(F);
D.event.bubble.wikiStyler(F);
A.appendChild(F);
}};


/* themes.js */
Timeline.ClassicTheme=new Object();
Timeline.ClassicTheme.implementations=[];
Timeline.ClassicTheme.create=function(A){if(A==null){A=Timeline.getDefaultLocale();
}var B=Timeline.ClassicTheme.implementations[A];
if(B==null){B=Timeline.ClassicTheme._Impl;
}return new B();
};
Timeline.ClassicTheme._Impl=function(){this.firstDayOfWeek=0;
this.ether={backgroundColors:["#EEE","#DDD","#CCC","#AAA"],highlightColor:"white",highlightOpacity:50,interval:{line:{show:true,color:"#aaa",opacity:25},weekend:{color:"#FFFFE0",opacity:30},marker:{hAlign:"Bottom",hBottomStyler:function(A){A.className="timeline-ether-marker-bottom";
},hBottomEmphasizedStyler:function(A){A.className="timeline-ether-marker-bottom-emphasized";
},hTopStyler:function(A){A.className="timeline-ether-marker-top";
},hTopEmphasizedStyler:function(A){A.className="timeline-ether-marker-top-emphasized";
},vAlign:"Right",vRightStyler:function(A){A.className="timeline-ether-marker-right";
},vRightEmphasizedStyler:function(A){A.className="timeline-ether-marker-right-emphasized";
},vLeftStyler:function(A){A.className="timeline-ether-marker-left";
},vLeftEmphasizedStyler:function(A){A.className="timeline-ether-marker-left-emphasized";
}}}};
this.event={track:{height:10,gap:2},overviewTrack:{offset:20,tickHeight:6,height:2,gap:1},tape:{height:4},instant:{icon:Timeline.urlPrefix+"images/dull-blue-circle.png",iconWidth:10,iconHeight:10,color:"#58A0DC",impreciseColor:"#58A0DC",impreciseOpacity:20},duration:{color:"#58A0DC",impreciseColor:"#58A0DC",impreciseOpacity:20},label:{backgroundColor:"white",backgroundOpacity:50,lineColor:"#58A0DC",offsetFromLine:3},highlightColors:["#FFFF00","#FFC000","#FF0000","#0000FF"],bubble:{width:250,height:125,titleStyler:function(A){A.className="timeline-event-bubble-title";
},bodyStyler:function(A){A.className="timeline-event-bubble-body";
},imageStyler:function(A){A.className="timeline-event-bubble-image";
},wikiStyler:function(A){A.className="timeline-event-bubble-wiki";
},timeStyler:function(A){A.className="timeline-event-bubble-time";
}}};
};


/* timeline.js */
Timeline.strings={};
Timeline.getDefaultLocale=function(){return Timeline.clientLocale;
};
Timeline.create=function(C,B,A,D){return new Timeline._Impl(C,B,A,D);
};
Timeline.HORIZONTAL=0;
Timeline.VERTICAL=1;
Timeline._defaultTheme=null;
Timeline.createBandInfo=function(H){var G=("theme" in H)?H.theme:Timeline.getDefaultTheme();
var F=("eventSource" in H)?H.eventSource:null;
var E=new Timeline.LinearEther({centersOn:("date" in H)?H.date:new Date(),interval:SimileAjax.DateTime.gregorianUnitLengths[H.intervalUnit],pixelsPerInterval:H.intervalPixels});
var C=new Timeline.GregorianEtherPainter({unit:H.intervalUnit,multiple:("multiple" in H)?H.multiple:1,theme:G,align:("align" in H)?H.align:undefined});
var A={showText:("showEventText" in H)?H.showEventText:true,theme:G};
if("trackHeight" in H){A.trackHeight=H.trackHeight;
}if("trackGap" in H){A.trackGap=H.trackGap;
}var D=("overview" in H&&H.overview)?"overview":("layout" in H?H.layout:"original");
var B;
switch(D){case"overview":B=new Timeline.OverviewEventPainter(A);
break;
case"detailed":B=new Timeline.DetailedEventPainter(A);
break;
default:B=new Timeline.OriginalEventPainter(A);
}return{width:H.width,eventSource:F,timeZone:("timeZone" in H)?H.timeZone:0,ether:E,etherPainter:C,eventPainter:B};
};
Timeline.createHotZoneBandInfo=function(H){var G=("theme" in H)?H.theme:Timeline.getDefaultTheme();
var F=("eventSource" in H)?H.eventSource:null;
var E=new Timeline.HotZoneEther({centersOn:("date" in H)?H.date:new Date(),interval:SimileAjax.DateTime.gregorianUnitLengths[H.intervalUnit],pixelsPerInterval:H.intervalPixels,zones:H.zones});
var C=new Timeline.HotZoneGregorianEtherPainter({unit:H.intervalUnit,zones:H.zones,theme:G,align:("align" in H)?H.align:undefined});
var A={showText:("showEventText" in H)?H.showEventText:true,theme:G};
if("trackHeight" in H){A.trackHeight=H.trackHeight;
}if("trackGap" in H){A.trackGap=H.trackGap;
}var D=("overview" in H&&H.overview)?"overview":("layout" in H?H.layout:"original");
var B;
switch(D){case"overview":B=new Timeline.OverviewEventPainter(A);
break;
case"detailed":B=new Timeline.DetailedEventPainter(A);
break;
default:B=new Timeline.OriginalEventPainter(A);
}return{width:H.width,eventSource:F,timeZone:("timeZone" in H)?H.timeZone:0,ether:E,etherPainter:C,eventPainter:B};
};
Timeline.getDefaultTheme=function(){if(Timeline._defaultTheme==null){Timeline._defaultTheme=Timeline.ClassicTheme.create(Timeline.getDefaultLocale());
}return Timeline._defaultTheme;
};
Timeline.setDefaultTheme=function(A){Timeline._defaultTheme=A;
};
Timeline.loadXML=function(A,C){var D=function(G,E,F){alert("Failed to load data xml from "+A+"\n"+G);
};
var B=function(F){var E=F.responseXML;
if(!E.documentElement&&F.responseStream){E.load(F.responseStream);
}C(E,A);
};
SimileAjax.XmlHttp.get(A,D,B);
};
Timeline.loadJSON=function(url,f){var fError=function(statusText,status,xmlhttp){alert("Failed to load json data from "+url+"\n"+statusText);
};
var fDone=function(xmlhttp){f(eval("("+xmlhttp.responseText+")"),url);
};
SimileAjax.XmlHttp.get(url,fError,fDone);
};
Timeline._Impl=function(C,B,A,D){SimileAjax.WindowManager.initialize();
this._containerDiv=C;
this._bandInfos=B;
this._orientation=A==null?Timeline.HORIZONTAL:A;
this._unit=(D!=null)?D:SimileAjax.NativeDateUnit;
this._initialize();
};
Timeline._Impl.prototype.dispose=function(){for(var A=0;
A<this._bands.length;
A++){this._bands[A].dispose();
}this._bands=null;
this._bandInfos=null;
this._containerDiv.innerHTML="";
};
Timeline._Impl.prototype.getBandCount=function(){return this._bands.length;
};
Timeline._Impl.prototype.getBand=function(A){return this._bands[A];
};
Timeline._Impl.prototype.layout=function(){this._distributeWidths();
};
Timeline._Impl.prototype.paint=function(){for(var A=0;
A<this._bands.length;
A++){this._bands[A].paint();
}};
Timeline._Impl.prototype.getDocument=function(){return this._containerDiv.ownerDocument;
};
Timeline._Impl.prototype.addDiv=function(A){this._containerDiv.appendChild(A);
};
Timeline._Impl.prototype.removeDiv=function(A){this._containerDiv.removeChild(A);
};
Timeline._Impl.prototype.isHorizontal=function(){return this._orientation==Timeline.HORIZONTAL;
};
Timeline._Impl.prototype.isVertical=function(){return this._orientation==Timeline.VERTICAL;
};
Timeline._Impl.prototype.getPixelLength=function(){return this._orientation==Timeline.HORIZONTAL?this._containerDiv.offsetWidth:this._containerDiv.offsetHeight;
};
Timeline._Impl.prototype.getPixelWidth=function(){return this._orientation==Timeline.VERTICAL?this._containerDiv.offsetWidth:this._containerDiv.offsetHeight;
};
Timeline._Impl.prototype.getUnit=function(){return this._unit;
};
Timeline._Impl.prototype.loadXML=function(B,D){var A=this;
var E=function(H,F,G){alert("Failed to load data xml from "+B+"\n"+H);
A.hideLoadingMessage();
};
var C=function(G){try{var F=G.responseXML;
if(!F.documentElement&&G.responseStream){F.load(G.responseStream);
}D(F,B);
}finally{A.hideLoadingMessage();
}};
this.showLoadingMessage();
window.setTimeout(function(){SimileAjax.XmlHttp.get(B,E,C);
},0);
};
Timeline._Impl.prototype.loadJSON=function(url,f){var tl=this;
var fError=function(statusText,status,xmlhttp){alert("Failed to load json data from "+url+"\n"+statusText);
tl.hideLoadingMessage();
};
var fDone=function(xmlhttp){try{f(eval("("+xmlhttp.responseText+")"),url);
}finally{tl.hideLoadingMessage();
}};
this.showLoadingMessage();
window.setTimeout(function(){SimileAjax.XmlHttp.get(url,fError,fDone);
},0);
};
Timeline._Impl.prototype._initialize=function(){var G=this._containerDiv;
var D=G.ownerDocument;
G.className=G.className.split(" ").concat("timeline-container").join(" ");
while(G.firstChild){G.removeChild(G.firstChild);
}var A=SimileAjax.Graphics.createTranslucentImage(Timeline.urlPrefix+(this.isHorizontal()?"images/copyright-vertical.png":"images/copyright.png"));
A.className="timeline-copyright";
A.title="Timeline (c) SIMILE - http://simile.mit.edu/timeline/";
SimileAjax.DOM.registerEvent(A,"click",function(){window.location="http://simile.mit.edu/timeline/";
});
G.appendChild(A);
this._bands=[];
for(var B=0;
B<this._bandInfos.length;
B++){var F=new Timeline._Band(this,this._bandInfos[B],B);
this._bands.push(F);
}this._distributeWidths();
for(var B=0;
B<this._bandInfos.length;
B++){var E=this._bandInfos[B];
if("syncWith" in E){this._bands[B].setSyncWithBand(this._bands[E.syncWith],("highlight" in E)?E.highlight:false);
}}var C=SimileAjax.Graphics.createMessageBubble(D);
C.containerDiv.className="timeline-message-container";
G.appendChild(C.containerDiv);
C.contentDiv.className="timeline-message";
C.contentDiv.innerHTML="<img src='"+Timeline.urlPrefix+"images/progress-running.gif' /> Loading...";
this.showLoadingMessage=function(){C.containerDiv.style.display="block";
};
this.hideLoadingMessage=function(){C.containerDiv.style.display="none";
};
};
Timeline._Impl.prototype._distributeWidths=function(){var B=this.getPixelLength();
var A=this.getPixelWidth();
var D=0;
for(var E=0;
E<this._bands.length;
E++){var I=this._bands[E];
var J=this._bandInfos[E];
var F=J.width;
var H=F.indexOf("%");
if(H>0){var G=parseInt(F.substr(0,H));
var C=G*A/100;
}else{var C=parseInt(F);
}I.setBandShiftAndWidth(D,C);
I.setViewLength(B);
D+=C;
}};
Timeline._Band=function(E,F,B){this._timeline=E;
this._bandInfo=F;
this._index=B;
this._locale=("locale" in F)?F.locale:Timeline.getDefaultLocale();
this._timeZone=("timeZone" in F)?F.timeZone:0;
this._labeller=("labeller" in F)?F.labeller:(("createLabeller" in E.getUnit())?E.getUnit().createLabeller(this._locale,this._timeZone):new Timeline.GregorianDateLabeller(this._locale,this._timeZone));
this._dragging=false;
this._changing=false;
this._originalScrollSpeed=5;
this._scrollSpeed=this._originalScrollSpeed;
this._onScrollListeners=[];
var A=this;
this._syncWithBand=null;
this._syncWithBandHandler=function(G){A._onHighlightBandScroll();
};
this._selectorListener=function(G){A._onHighlightBandScroll();
};
var D=this._timeline.getDocument().createElement("div");
D.className="timeline-band-input";
this._timeline.addDiv(D);
this._keyboardInput=document.createElement("input");
this._keyboardInput.type="text";
D.appendChild(this._keyboardInput);
SimileAjax.DOM.registerEventWithObject(this._keyboardInput,"keydown",this,"_onKeyDown");
SimileAjax.DOM.registerEventWithObject(this._keyboardInput,"keyup",this,"_onKeyUp");
this._div=this._timeline.getDocument().createElement("div");
this._div.className="timeline-band timeline-band-"+B;
this._timeline.addDiv(this._div);
SimileAjax.DOM.registerEventWithObject(this._div,"mousedown",this,"_onMouseDown");
SimileAjax.DOM.registerEventWithObject(this._div,"mousemove",this,"_onMouseMove");
SimileAjax.DOM.registerEventWithObject(this._div,"mouseup",this,"_onMouseUp");
SimileAjax.DOM.registerEventWithObject(this._div,"mouseout",this,"_onMouseOut");
SimileAjax.DOM.registerEventWithObject(this._div,"dblclick",this,"_onDblClick");
this._innerDiv=this._timeline.getDocument().createElement("div");
this._innerDiv.className="timeline-band-inner";
this._div.appendChild(this._innerDiv);
this._ether=F.ether;
F.ether.initialize(E);
this._etherPainter=F.etherPainter;
F.etherPainter.initialize(this,E);
this._eventSource=F.eventSource;
if(this._eventSource){this._eventListener={onAddMany:function(){A._onAddMany();
},onClear:function(){A._onClear();
}};
this._eventSource.addListener(this._eventListener);
}this._eventPainter=F.eventPainter;
F.eventPainter.initialize(this,E);
this._decorators=("decorators" in F)?F.decorators:[];
for(var C=0;
C<this._decorators.length;
C++){this._decorators[C].initialize(this,E);
}};
Timeline._Band.SCROLL_MULTIPLES=5;
Timeline._Band.prototype.dispose=function(){this.closeBubble();
if(this._eventSource){this._eventSource.removeListener(this._eventListener);
this._eventListener=null;
this._eventSource=null;
}this._timeline=null;
this._bandInfo=null;
this._labeller=null;
this._ether=null;
this._etherPainter=null;
this._eventPainter=null;
this._decorators=null;
this._onScrollListeners=null;
this._syncWithBandHandler=null;
this._selectorListener=null;
this._div=null;
this._innerDiv=null;
this._keyboardInput=null;
};
Timeline._Band.prototype.addOnScrollListener=function(A){this._onScrollListeners.push(A);
};
Timeline._Band.prototype.removeOnScrollListener=function(B){for(var A=0;
A<this._onScrollListeners.length;
A++){if(this._onScrollListeners[A]==B){this._onScrollListeners.splice(A,1);
break;
}}};
Timeline._Band.prototype.setSyncWithBand=function(B,A){if(this._syncWithBand){this._syncWithBand.removeOnScrollListener(this._syncWithBandHandler);
}this._syncWithBand=B;
this._syncWithBand.addOnScrollListener(this._syncWithBandHandler);
this._highlight=A;
this._positionHighlight();
};
Timeline._Band.prototype.getLocale=function(){return this._locale;
};
Timeline._Band.prototype.getTimeZone=function(){return this._timeZone;
};
Timeline._Band.prototype.getLabeller=function(){return this._labeller;
};
Timeline._Band.prototype.getIndex=function(){return this._index;
};
Timeline._Band.prototype.getEther=function(){return this._ether;
};
Timeline._Band.prototype.getEtherPainter=function(){return this._etherPainter;
};
Timeline._Band.prototype.getEventSource=function(){return this._eventSource;
};
Timeline._Band.prototype.getEventPainter=function(){return this._eventPainter;
};
Timeline._Band.prototype.layout=function(){this.paint();
};
Timeline._Band.prototype.paint=function(){this._etherPainter.paint();
this._paintDecorators();
this._paintEvents();
};
Timeline._Band.prototype.softLayout=function(){this.softPaint();
};
Timeline._Band.prototype.softPaint=function(){this._etherPainter.softPaint();
this._softPaintDecorators();
this._softPaintEvents();
};
Timeline._Band.prototype.setBandShiftAndWidth=function(A,D){var C=this._keyboardInput.parentNode;
var B=A+Math.floor(D/2);
if(this._timeline.isHorizontal()){this._div.style.top=A+"px";
this._div.style.height=D+"px";
C.style.top=B+"px";
C.style.left="-1em";
}else{this._div.style.left=A+"px";
this._div.style.width=D+"px";
C.style.left=B+"px";
C.style.top="-1em";
}};
Timeline._Band.prototype.getViewWidth=function(){if(this._timeline.isHorizontal()){return this._div.offsetHeight;
}else{return this._div.offsetWidth;
}};
Timeline._Band.prototype.setViewLength=function(A){this._viewLength=A;
this._recenterDiv();
this._onChanging();
};
Timeline._Band.prototype.getViewLength=function(){return this._viewLength;
};
Timeline._Band.prototype.getTotalViewLength=function(){return Timeline._Band.SCROLL_MULTIPLES*this._viewLength;
};
Timeline._Band.prototype.getViewOffset=function(){return this._viewOffset;
};
Timeline._Band.prototype.getMinDate=function(){return this._ether.pixelOffsetToDate(this._viewOffset);
};
Timeline._Band.prototype.getMaxDate=function(){return this._ether.pixelOffsetToDate(this._viewOffset+Timeline._Band.SCROLL_MULTIPLES*this._viewLength);
};
Timeline._Band.prototype.getMinVisibleDate=function(){return this._ether.pixelOffsetToDate(0);
};
Timeline._Band.prototype.getMaxVisibleDate=function(){return this._ether.pixelOffsetToDate(this._viewLength);
};
Timeline._Band.prototype.getCenterVisibleDate=function(){return this._ether.pixelOffsetToDate(this._viewLength/2);
};
Timeline._Band.prototype.setMinVisibleDate=function(A){if(!this._changing){this._moveEther(Math.round(-this._ether.dateToPixelOffset(A)));
}};
Timeline._Band.prototype.setMaxVisibleDate=function(A){if(!this._changing){this._moveEther(Math.round(this._viewLength-this._ether.dateToPixelOffset(A)));
}};
Timeline._Band.prototype.setCenterVisibleDate=function(A){if(!this._changing){this._moveEther(Math.round(this._viewLength/2-this._ether.dateToPixelOffset(A)));
}};
Timeline._Band.prototype.dateToPixelOffset=function(A){return this._ether.dateToPixelOffset(A)-this._viewOffset;
};
Timeline._Band.prototype.pixelOffsetToDate=function(A){return this._ether.pixelOffsetToDate(A+this._viewOffset);
};
Timeline._Band.prototype.createLayerDiv=function(D,B){var C=this._timeline.getDocument().createElement("div");
C.className="timeline-band-layer"+(typeof B=="string"?(" "+B):"");
C.style.zIndex=D;
this._innerDiv.appendChild(C);
var A=this._timeline.getDocument().createElement("div");
A.className="timeline-band-layer-inner";
if(SimileAjax.Platform.browser.isIE){A.style.cursor="move";
}else{A.style.cursor="-moz-grab";
}C.appendChild(A);
return A;
};
Timeline._Band.prototype.removeLayerDiv=function(A){this._innerDiv.removeChild(A.parentNode);
};
Timeline._Band.prototype.scrollToCenter=function(B,C){var A=this._ether.dateToPixelOffset(B);
if(A<-this._viewLength/2){this.setCenterVisibleDate(this.pixelOffsetToDate(A+this._viewLength));
}else{if(A>3*this._viewLength/2){this.setCenterVisibleDate(this.pixelOffsetToDate(A-this._viewLength));
}}this._autoScroll(Math.round(this._viewLength/2-this._ether.dateToPixelOffset(B)),C);
};
Timeline._Band.prototype.showBubbleForEvent=function(C){var A=this.getEventSource().getEvent(C);
if(A){var B=this;
this.scrollToCenter(A.getStart(),function(){B._eventPainter.showBubble(A);
});
}};
Timeline._Band.prototype._onMouseDown=function(B,A,C){this.closeBubble();
this._dragging=true;
this._dragX=A.clientX;
this._dragY=A.clientY;
};
Timeline._Band.prototype._onMouseMove=function(D,A,E){if(this._dragging){var C=A.clientX-this._dragX;
var B=A.clientY-this._dragY;
this._dragX=A.clientX;
this._dragY=A.clientY;
this._moveEther(this._timeline.isHorizontal()?C:B);
this._positionHighlight();
}};
Timeline._Band.prototype._onMouseUp=function(B,A,C){this._dragging=false;
this._keyboardInput.focus();
};
Timeline._Band.prototype._onMouseOut=function(B,A,D){var C=SimileAjax.DOM.getEventRelativeCoordinates(A,B);
C.x+=this._viewOffset;
if(C.x<0||C.x>B.offsetWidth||C.y<0||C.y>B.offsetHeight){this._dragging=false;
}};
Timeline._Band.prototype._onDblClick=function(B,A,D){var C=SimileAjax.DOM.getEventRelativeCoordinates(A,B);
var E=C.x-(this._viewLength/2-this._viewOffset);
this._autoScroll(-E);
};
Timeline._Band.prototype._onKeyDown=function(B,A,C){if(!this._dragging){switch(A.keyCode){case 27:break;
case 37:case 38:this._scrollSpeed=Math.min(50,Math.abs(this._scrollSpeed*1.05));
this._moveEther(this._scrollSpeed);
break;
case 39:case 40:this._scrollSpeed=-Math.min(50,Math.abs(this._scrollSpeed*1.05));
this._moveEther(this._scrollSpeed);
break;
default:return true;
}this.closeBubble();
SimileAjax.DOM.cancelEvent(A);
return false;
}return true;
};
Timeline._Band.prototype._onKeyUp=function(B,A,C){if(!this._dragging){this._scrollSpeed=this._originalScrollSpeed;
switch(A.keyCode){case 35:this.setCenterVisibleDate(this._eventSource.getLatestDate());
break;
case 36:this.setCenterVisibleDate(this._eventSource.getEarliestDate());
break;
case 33:this._autoScroll(this._timeline.getPixelLength());
break;
case 34:this._autoScroll(-this._timeline.getPixelLength());
break;
default:return true;
}this.closeBubble();
SimileAjax.DOM.cancelEvent(A);
return false;
}return true;
};
Timeline._Band.prototype._autoScroll=function(D,C){var A=this;
var B=SimileAjax.Graphics.createAnimation(function(E,F){A._moveEther(F);
},0,D,1000,C);
B.run();
};
Timeline._Band.prototype._moveEther=function(A){this.closeBubble();
this._viewOffset+=A;
this._ether.shiftPixels(-A);
if(this._timeline.isHorizontal()){this._div.style.left=this._viewOffset+"px";
}else{this._div.style.top=this._viewOffset+"px";
}if(this._viewOffset>-this._viewLength*0.5||this._viewOffset<-this._viewLength*(Timeline._Band.SCROLL_MULTIPLES-1.5)){this._recenterDiv();
}else{this.softLayout();
}this._onChanging();
};
Timeline._Band.prototype._onChanging=function(){this._changing=true;
this._fireOnScroll();
this._setSyncWithBandDate();
this._changing=false;
};
Timeline._Band.prototype._fireOnScroll=function(){for(var A=0;
A<this._onScrollListeners.length;
A++){this._onScrollListeners[A](this);
}};
Timeline._Band.prototype._setSyncWithBandDate=function(){if(this._syncWithBand){var A=this._ether.pixelOffsetToDate(this.getViewLength()/2);
this._syncWithBand.setCenterVisibleDate(A);
}};
Timeline._Band.prototype._onHighlightBandScroll=function(){if(this._syncWithBand){var A=this._syncWithBand.getCenterVisibleDate();
var B=this._ether.dateToPixelOffset(A);
this._moveEther(Math.round(this._viewLength/2-B));
if(this._highlight){this._etherPainter.setHighlight(this._syncWithBand.getMinVisibleDate(),this._syncWithBand.getMaxVisibleDate());
}}};
Timeline._Band.prototype._onAddMany=function(){this._paintEvents();
};
Timeline._Band.prototype._onClear=function(){this._paintEvents();
};
Timeline._Band.prototype._positionHighlight=function(){if(this._syncWithBand){var A=this._syncWithBand.getMinVisibleDate();
var B=this._syncWithBand.getMaxVisibleDate();
if(this._highlight){this._etherPainter.setHighlight(A,B);
}}};
Timeline._Band.prototype._recenterDiv=function(){this._viewOffset=-this._viewLength*(Timeline._Band.SCROLL_MULTIPLES-1)/2;
if(this._timeline.isHorizontal()){this._div.style.left=this._viewOffset+"px";
this._div.style.width=(Timeline._Band.SCROLL_MULTIPLES*this._viewLength)+"px";
}else{this._div.style.top=this._viewOffset+"px";
this._div.style.height=(Timeline._Band.SCROLL_MULTIPLES*this._viewLength)+"px";
}this.layout();
};
Timeline._Band.prototype._paintEvents=function(){this._eventPainter.paint();
};
Timeline._Band.prototype._softPaintEvents=function(){this._eventPainter.softPaint();
};
Timeline._Band.prototype._paintDecorators=function(){for(var A=0;
A<this._decorators.length;
A++){this._decorators[A].paint();
}};
Timeline._Band.prototype._softPaintDecorators=function(){for(var A=0;
A<this._decorators.length;
A++){this._decorators[A].softPaint();
}};
Timeline._Band.prototype.closeBubble=function(){SimileAjax.WindowManager.cancelPopups();
};


/* units.js */
Timeline.NativeDateUnit=new Object();
Timeline.NativeDateUnit.createLabeller=function(A,B){return new Timeline.GregorianDateLabeller(A,B);
};
Timeline.NativeDateUnit.makeDefaultValue=function(){return new Date();
};
Timeline.NativeDateUnit.cloneValue=function(A){return new Date(A.getTime());
};
Timeline.NativeDateUnit.getParser=function(A){if(typeof A=="string"){A=A.toLowerCase();
}return(A=="iso8601"||A=="iso 8601")?Timeline.DateTime.parseIso8601DateTime:Timeline.DateTime.parseGregorianDateTime;
};
Timeline.NativeDateUnit.parseFromObject=function(A){return Timeline.DateTime.parseGregorianDateTime(A);
};
Timeline.NativeDateUnit.toNumber=function(A){return A.getTime();
};
Timeline.NativeDateUnit.fromNumber=function(A){return new Date(A);
};
Timeline.NativeDateUnit.compare=function(D,C){var B,A;
if(typeof D=="object"){B=D.getTime();
}else{B=Number(D);
}if(typeof C=="object"){A=C.getTime();
}else{A=Number(C);
}return B-A;
};
Timeline.NativeDateUnit.earlier=function(B,A){return Timeline.NativeDateUnit.compare(B,A)<0?B:A;
};
Timeline.NativeDateUnit.later=function(B,A){return Timeline.NativeDateUnit.compare(B,A)>0?B:A;
};
Timeline.NativeDateUnit.change=function(A,B){return new Date(A.getTime()+B);
};

Timeline.GregorianDateLabeller.monthNames["en"] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];


Timeline.strings["en"] = {
    wikiLinkLabel:  "Discuss"
};


//TIMEPLOT PACKAGE - LOAD ORDER 3 of 3

window.Timeplot = {
	loaded:     true,
	params:     { bundle: true, autoCreate: true },
	namespace:  "http://simile.mit.edu/2007/06/timeplot#",
	importers:  {}
};
Timeplot.loaded = true;
Timeplot.urlPrefix = '/';

//TIMEPLOT.JS
/**
 * Timeplot
 * 
 * @fileOverview Timeplot
 * @name Timeplot
 */

Timeline.Debug = SimileAjax.Debug; // timeline uses it's own debug system which is not as advanced
var log = SimileAjax.Debug.log; // shorter name is easier to use

/*
 * This function is used to implement a raw but effective OOP-like inheritance
 * in various Timeplot classes.
 */
Object.extend = function(destination, source) {
    for (var property in source) {
        destination[property] = source[property];
    }
    return destination;
}

// ---------------------------------------------

/**
 * Create a timeplot attached to the given element and using the configuration from the given array of PlotInfos
 */
Timeplot.create = function(elmt, plotInfos) {
    return new Timeplot._Impl(elmt, plotInfos);
};

/**
 * Create a PlotInfo configuration from the given map of params
 */
Timeplot.createPlotInfo = function(params) {
    return {   
        id:                ("id" in params) ? params.id : "p" + Math.round(Math.random() * 1000000),
        dataSource:        ("dataSource" in params) ? params.dataSource : null,
        eventSource:       ("eventSource" in params) ? params.eventSource : null,
        timeGeometry:      ("timeGeometry" in params) ? params.timeGeometry : new Timeplot.DefaultTimeGeometry(),
        valueGeometry:     ("valueGeometry" in params) ? params.valueGeometry : new Timeplot.DefaultValueGeometry(),
        timeZone:          ("timeZone" in params) ? params.timeZone : 0,
        fillColor:         ("fillColor" in params) ? ((params.fillColor == "string") ? new Timeplot.Color(params.fillColor) : params.fillColor) : null,
        fillGradient:      ("fillGradient" in params) ? params.fillGradient : true,
        fillFrom:          ("fillFrom" in params) ? params.fillFrom : Number.NEGATIVE_INFINITY,
        lineColor:         ("lineColor" in params) ? ((params.lineColor == "string") ? new Timeplot.Color(params.lineColor) : params.lineColor) : new Timeplot.Color("#606060"),
        lineWidth:         ("lineWidth" in params) ? params.lineWidth : 1.0,
        dotRadius:         ("dotRadius" in params) ? params.dotRadius : 2.0,
        dotColor:          ("dotColor" in params) ? params.dotColor : null,
        eventLineWidth:    ("eventLineWidth" in params) ? params.eventLineWidth : 1.0,
        showValues:        ("showValues" in params) ? params.showValues : false,
        roundValues:       ("roundValues" in params) ? params.roundValues : true,
        valuesOpacity:     ("valuesOpacity" in params) ? params.valuesOpacity : 75,
        bubbleWidth:       ("bubbleWidth" in params) ? params.bubbleWidth : 300,
        bubbleHeight:      ("bubbleHeight" in params) ? params.bubbleHeight : 200
    };
};

// -------------------------------------------------------

/**
 * This is the implementation of the Timeplot object.
 *  
 * @constructor 
 */
Timeplot._Impl = function(elmt, plotInfos) {
    this._id = "t" + Math.round(Math.random() * 1000000);
    this._containerDiv = elmt;
    this._plotInfos = plotInfos;
    this._painters = {
        background: [],
        foreground: []
    };
    this._painter = null;
    this._active = false;
    this._upright = false;
    this._initialize();
};

Timeplot._Impl.prototype = {

    dispose: function() {
        for (var i = 0; i < this._plots.length; i++) {
            this._plots[i].dispose();
        }
        this._plots = null;
        this._plotsInfos = null;
        this._containerDiv.innerHTML = "";
    },
    
    /**
     * Returns the main container div this timeplot is operating on.
     */
    getElement: function() {
        return this._containerDiv;
    },
    
    /**
     * Returns document this timeplot belongs to.
     */
    getDocument: function() {
        return this._containerDiv.ownerDocument;
    },

    /**
     * Append the given element to the timeplot DOM
     */
    add: function(div) {
        this._containerDiv.appendChild(div);
    },

    /**
     * Remove the given element to the timeplot DOM
     */
    remove: function(div) {
        this._containerDiv.removeChild(div);
    },

    /**
     * Add a painter to the timeplot
     */
    addPainter: function(layerName, painter) {
        var layer = this._painters[layerName];
        if (layer) {
            for (var i = 0; i < layer.length; i++) {
                if (layer[i].context._id == painter.context._id) {
                    return;
                }
            }
            layer.push(painter);
        }
    },
    
    /**
     * Remove a painter from the timeplot
     */
    removePainter: function(layerName, painter) {
        var layer = this._painters[layerName];
        if (layer) {
            for (var i = 0; i < layer.length; i++) {
                if (layer[i].context._id == painter.context._id) {
                    layer.splice(i, 1);
                    break;
                }
            }
        }
    },
    
    /**
     * Get the width in pixels of the area occupied by the entire timeplot in the page
     */
    getWidth: function() {
        return this._containerDiv.clientWidth;
    },

    /**
     * Get the height in pixels of the area occupied by the entire timeplot in the page
     */
    getHeight: function() {
        return this._containerDiv.clientHeight;
    },
    
    /**
     * Get the drawing canvas associated with this timeplot
     */
    getCanvas: function() {
        return this._canvas;
    },
    
    /**
     * <p>Load the data from the given url into the given eventSource, using
     * the given separator to parse the columns and preprocess it before parsing
     * thru the optional filter function. The filter is useful for when 
     * the data is row-oriented but the format is not compatible with the
     * one that Timeplot expects.</p> 
     * 
     * <p>Here is an example of a filter that changes dates in the form 'yyyy/mm/dd'
     * in the required 'yyyy-mm-dd' format:
     * <pre>var dataFilter = function(data) {
     *     for (var i = 0; i < data.length; i++) {
     *         var row = data[i];
     *         row[0] = row[0].replace(/\//g,"-");
     *     }
     *     return data;
     * };</pre></p>
     */
    loadText: function(url, separator, eventSource, filter, format) {
        if (this._active) {
            var tp = this;
            
            var fError = function(statusText, status, xmlhttp) {
                alert("Failed to load data xml from " + url + "\n" + statusText);
                tp.hideLoadingMessage();
            };
            
            var fDone = function(xmlhttp) {
                try {
                    eventSource.loadText(xmlhttp.responseText, separator, url, filter, format);
                } catch (e) {
                    SimileAjax.Debug.exception(e);
                } finally {
                    tp.hideLoadingMessage();
                }
            };
            
            this.showLoadingMessage();
            window.setTimeout(function() { SimileAjax.XmlHttp.get(url, fError, fDone); }, 0);
        }
    },
    
    /**
     * Loads data from an object with date key and array value pairs.
     * Delegates to DefaultEventSource.prototype.loadJSON
	 * 
	 * {'YYYY-MM-DD': [val1, val2 ... valn], 'YYYY-MM-DD': [], ...}
	 *
	 * @param data The JSON object
	 * @param format the Date format, defaults to 'iso8601'
     */
     loadJSON : function(data, eventSource, format) {
	     if(data && this._active) {
		     eventSource.loadJSON(data, format);
	     }
     },

    /**
     * Load event data from the given url into the given eventSource, using
     * the Timeline XML event format.
     */
    loadXML: function(url, eventSource) {
        if (this._active) {
            var tl = this;
            
            var fError = function(statusText, status, xmlhttp) {
                alert("Failed to load data xml from " + url + "\n" + statusText);
                tl.hideLoadingMessage();
            };
            
            var fDone = function(xmlhttp) {
                try {
                    var xml = xmlhttp.responseXML;
                    if (!xml.documentElement && xmlhttp.responseStream) {
                        xml.load(xmlhttp.responseStream);
                    } 
                    eventSource.loadXML(xml, url);
                } finally {
                    tl.hideLoadingMessage();
                }
            };
            
            this.showLoadingMessage();
            window.setTimeout(function() { SimileAjax.XmlHttp.get(url, fError, fDone); }, 0);
        }
    },
    
    /**
     * Overlay a 'div' element filled with the given text and styles to this timeplot
     * This is used to implement labels since canvas does not support drawing text.
     */
    putText: function(id, text, clazz, styles) {
        var div = this.putDiv(id, "timeplot-div " + clazz, styles);
        div.innerHTML = text;
        return div;
    },

    /**
     * Overlay a 'div' element, with the given class and the given styles to this timeplot.
     * This is used for labels and horizontal and vertical grids. 
     */
    putDiv: function(id, clazz, styles) {
        var tid = this._id + "-" + id;
        var div = document.getElementById(tid);
        if (!div) {
            var container = this._containerDiv.firstChild; // get the divs container
            div = document.createElement("div");
            div.setAttribute("id",tid);
            container.appendChild(div);
        }
        div.setAttribute("class","timeplot-div " + clazz);
        div.setAttribute("className","timeplot-div " + clazz);
        this.placeDiv(div,styles);
        return div;
    },
    
    /**
     * Associate the given map of styles to the given element. 
     * In case such styles indicate position (left,right,top,bottom) correct them
     * with the padding information so that they align to the 'internal' area
     * of the timeplot.
     */
    placeDiv: function(div, styles) {
        if (styles) {
            for (style in styles) {
                if (style == "left") {
                    styles[style] += this._paddingX;
                    styles[style] += "px";
                } else if (style == "right") {
                    styles[style] += this._paddingX;
                    styles[style] += "px";
                } else if (style == "top") {
                    styles[style] += this._paddingY;
                    styles[style] += "px";
                } else if (style == "bottom") {
                    styles[style] += this._paddingY;
                    styles[style] += "px";
                } else if (style == "width") {
                    if (styles[style] < 0) styles[style] = 0;
                    styles[style] += "px";
                } else if (style == "height") {
                    if (styles[style] < 0) styles[style] = 0;
                    styles[style] += "px";
                }
                div.style[style] = styles[style];
            }
        }
    },
    
    /**
     * return a {x,y} map with the location of the given element relative to the 'internal' area of the timeplot
     * (that is, without the container padding)
     */
    locate: function(div) {
        return {
            x: div.offsetLeft - this._paddingX,
            y: div.offsetTop - this._paddingY
        }
    },
    
    /**
     * Forces timeplot to re-evaluate the various value and time geometries
     * associated with its plot layers and repaint accordingly. This should
     * be invoked after the data in any of the data sources has been
     * modified.
     */
    update: function() {
        if (this._active) {
            for (var i = 0; i < this._plots.length; i++) {
                var plot = this._plots[i];
                var dataSource = plot.getDataSource();
                if (dataSource) {
                    var range = dataSource.getRange();
                    if (range) {
                        plot._valueGeometry.setRange(range);
                        plot._timeGeometry.setRange(range);
                    }
                }
                plot.hideValues();
            }
            this.paint();
        }
    },
    
    /**
     * Forces timeplot to re-evaluate its own geometry, clear itself and paint.
     * This should be used instead of paint() when you're not sure if the 
     * geometry of the page has changed or not. 
     */
    repaint: function() {
        if (this._active) {
            this._prepareCanvas();
            for (var i = 0; i < this._plots.length; i++) {
                var plot = this._plots[i];
                if (plot._timeGeometry) plot._timeGeometry.reset();
                if (plot._valueGeometry) plot._valueGeometry.reset();
            }
            this.paint();
        }
    },
    
    /**
     * Calls all the painters that were registered to this timeplot and makes them
     * paint the timeplot. This should be used only when you're sure that the geometry
     * of the page hasn't changed.
     * NOTE: painting is performed by a different thread and it's safe to call this
     * function in bursts (as in mousemove or during window resizing
     */
    paint: function() {
        if (this._active && this._painter == null) {
            var timeplot = this;
            this._painter = window.setTimeout(function() {
                timeplot._clearCanvas();
                
                var run = function(action,context) {
                    try {
                        if (context.setTimeplot) context.setTimeplot(timeplot);
                        action.apply(context,[]);
                    } catch (e) {
                        SimileAjax.Debug.exception(e);
                    }
                }
                
                var background = timeplot._painters.background;
                for (var i = 0; i < background.length; i++) {
                    run(background[i].action, background[i].context); 
                }
                var foreground = timeplot._painters.foreground;
                for (var i = 0; i < foreground.length; i++) {
                    run(foreground[i].action, foreground[i].context); 
                }
                
                timeplot._painter = null;
            }, 20);
        }
    },

    _clearCanvas: function() {
        var canvas = this.getCanvas();
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
    },
    
    _clearLabels: function() {
        var labels = this._containerDiv.firstChild;
        if (labels) this._containerDiv.removeChild(labels);
        labels = document.createElement("div");
        this._containerDiv.appendChild(labels);
    },
    
    _prepareCanvas: function() {
        var canvas = this.getCanvas();

        // using jQuery.  note we calculate the average padding; if your
        // padding settings are not symmetrical, the labels will be off
        // since they expect to be centered on the canvas.
        var con = SimileAjax.jQuery(this._containerDiv);
        this._paddingX = (parseInt(con.css('paddingLeft')) +
                          parseInt(con.css('paddingRight'))) / 2;
        this._paddingY = (parseInt(con.css('paddingTop')) +
                          parseInt(con.css('paddingBottom'))) / 2;

        canvas.width = this.getWidth() - (this._paddingX * 2);
        canvas.height = this.getHeight() - (this._paddingY * 2);

        var ctx = canvas.getContext('2d');
        this._setUpright(ctx, canvas);
        ctx.globalCompositeOperation = 'source-over';
    },

    _setUpright: function(ctx, canvas) {
        // excanvas+IE requires this to be done only once, ever; actual canvas
        // implementations reset and require this for each call to re-layout
        if (!SimileAjax.Platform.browser.isIE) this._upright = false;
        if (!this._upright) {
            this._upright = true;
            ctx.translate(0, canvas.height);
            ctx.scale(1,-1);
        }
    },
    
    _isBrowserSupported: function(canvas) {
        var browser = SimileAjax.Platform.browser;
        if ((canvas.getContext && window.getComputedStyle) ||
            (browser.isIE && browser.majorVersion >= 6)) {
            return true;
        } else {
            return false;
        }
    },
    
    _initialize: function() {
        
        // initialize the window manager (used to handle the popups)
        // NOTE: this is a singleton and it's safe to call multiple times
        SimileAjax.WindowManager.initialize(); 
        
        var containerDiv = this._containerDiv;
        var doc = containerDiv.ownerDocument;
    
        // make sure the timeplot div has the right class    
        containerDiv.className = "timeplot-container " + containerDiv.className;
            
        // clean it up if it contains some content
        while (containerDiv.firstChild) {
            containerDiv.removeChild(containerDiv.firstChild);
        }
        
        var canvas = doc.createElement("canvas");
        
        if (this._isBrowserSupported(canvas)) {
            this._clearLabels();

            this._canvas = canvas;
            canvas.className = "timeplot-canvas";
            containerDiv.appendChild(canvas);
            if(!canvas.getContext && G_vmlCanvasManager) {
                canvas = G_vmlCanvasManager.initElement(this._canvas);
                this._canvas = canvas;
            }
            this._prepareCanvas();
    
            // inserting copyright and link to simile
            var elmtCopyright = SimileAjax.Graphics.createTranslucentImage(Timeplot.urlPrefix + "images/copyright.png");
            elmtCopyright.className = "timeplot-copyright";
            elmtCopyright.title = "Timeplot (c) SIMILE - http://simile.mit.edu/timeplot/";
            SimileAjax.DOM.registerEvent(elmtCopyright, "click", function() { window.location = "http://simile.mit.edu/timeplot/"; });
            containerDiv.appendChild(elmtCopyright);
            
            var timeplot = this;
            var painter = {
                onAddMany: function() { timeplot.update(); },
                onClear:   function() { timeplot.update(); }
            }

            // creating painters
            this._plots = [];
            if (this._plotInfos) {
                for (var i = 0; i < this._plotInfos.length; i++) {
                    var plot = new Timeplot.Plot(this, this._plotInfos[i]);
                    var dataSource = plot.getDataSource();
                    if (dataSource) {
                        dataSource.addListener(painter);
                    }
                    this.addPainter("background", {
                        context: plot.getTimeGeometry(),
                        action: plot.getTimeGeometry().paint
                    });
                    this.addPainter("background", {
                        context: plot.getValueGeometry(),
                        action: plot.getValueGeometry().paint
                    });
                    this.addPainter("foreground", {
                        context: plot,
                        action: plot.paint
                    });
                    this._plots.push(plot);
                    plot.initialize();
                }
            }
                
            // creating loading UI
            var message = SimileAjax.Graphics.createMessageBubble(doc);
            message.containerDiv.className = "timeplot-message-container";
            containerDiv.appendChild(message.containerDiv);
            
            message.contentDiv.className = "timeplot-message";
            message.contentDiv.innerHTML = "<img src='" + Timeplot.urlPrefix + "images/progress-running.gif' /> Loading...";
            
            this.showLoadingMessage = function() { message.containerDiv.style.display = "block"; };
            this.hideLoadingMessage = function() { message.containerDiv.style.display = "none"; };
    
            this._active = true;
            
        } else {
    
            this._message = SimileAjax.Graphics.createMessageBubble(doc);
            this._message.containerDiv.className = "timeplot-message-container";
            this._message.containerDiv.style.top = "15%";
            this._message.containerDiv.style.left = "20%";
            this._message.containerDiv.style.right = "20%";
            this._message.containerDiv.style.minWidth = "20em";
            this._message.contentDiv.className = "timeplot-message";
            this._message.contentDiv.innerHTML = "We're terribly sorry, but your browser is not currently supported by <a href='http://simile.mit.edu/timeplot/'>Timeplot</a>.<br><br> We are working on supporting it in the near future but, for now, see the <a href='http://simile.mit.edu/wiki/Timeplot_Limitations'>list of currently supported browsers</a>.";
            this._message.containerDiv.style.display = "block";

            containerDiv.appendChild(this._message.containerDiv);
    
        }
    }
};

//PLOT.JS

/**
 * Plot Layer
 * 
 * @fileOverview Plot Layer
 * @name Plot
 */
 
/**
 * A plot layer is the main building block for timeplots and it's the object
 * that is responsible for painting the plot itself. Each plot needs to have
 * a time geometry, either a DataSource (for time series
 * plots) or an EventSource (for event plots) and a value geometry in case 
 * of time series plots. Such parameters are passed along
 * in the 'plotInfo' map.
 * 
 * @constructor
 */
Timeplot.Plot = function(timeplot, plotInfo) {
    this._timeplot = timeplot;
    this._canvas = timeplot.getCanvas();
    this._plotInfo = plotInfo;
    this._id = plotInfo.id;
    this._timeGeometry = plotInfo.timeGeometry;
    this._valueGeometry = plotInfo.valueGeometry;
    this._theme = new Timeline.getDefaultTheme();
    this._dataSource = plotInfo.dataSource;
    this._eventSource = plotInfo.eventSource;
    this._bubble = null;
};

Timeplot.Plot.prototype = {
    
    /**
     * Initialize the plot layer
     */
    initialize: function() {
        if (this._dataSource && this._dataSource.getValue) {
            this._timeFlag = this._timeplot.putDiv("timeflag","timeplot-timeflag");
            this._valueFlag = this._timeplot.putDiv(this._id + "valueflag","timeplot-valueflag");
            this._valueFlagLineLeft = this._timeplot.putDiv(this._id + "valueflagLineLeft","timeplot-valueflag-line");
            this._valueFlagLineRight = this._timeplot.putDiv(this._id + "valueflagLineRight","timeplot-valueflag-line");
            if (!this._valueFlagLineLeft.firstChild) {
                this._valueFlagLineLeft.appendChild(SimileAjax.Graphics.createTranslucentImage(Timeplot.urlPrefix + "images/line_left.png"));
                this._valueFlagLineRight.appendChild(SimileAjax.Graphics.createTranslucentImage(Timeplot.urlPrefix + "images/line_right.png"));
            }
            this._valueFlagPole = this._timeplot.putDiv(this._id + "valuepole","timeplot-valueflag-pole");

            var opacity = this._plotInfo.valuesOpacity;
            
            SimileAjax.Graphics.setOpacity(this._timeFlag, opacity);
            SimileAjax.Graphics.setOpacity(this._valueFlag, opacity);
            SimileAjax.Graphics.setOpacity(this._valueFlagLineLeft, opacity);
            SimileAjax.Graphics.setOpacity(this._valueFlagLineRight, opacity);
            SimileAjax.Graphics.setOpacity(this._valueFlagPole, opacity);

            var plot = this;
            
            var mouseOverHandler = function(elmt, evt, target) {
                if (plot._plotInfo.showValues) { 
	                plot._valueFlag.style.display = "block";
	                mouseMoveHandler(elmt, evt, target);
	            }
            }
        
            var day = 24 * 60 * 60 * 1000;
            var month = 30 * day;
            
            var mouseMoveHandler = function(elmt, evt, target) {
                if (typeof SimileAjax != "undefined" && plot._plotInfo.showValues) {
                    var c = plot._canvas;
                    var x = Math.round(SimileAjax.DOM.getEventRelativeCoordinates(evt,plot._canvas).x);
                    if (x > c.width) x = c.width;
                    if (isNaN(x) || x < 0) x = 0;
                    var t = plot._timeGeometry.fromScreen(x);
                    if (t == 0) { // something is wrong
                        plot._valueFlag.style.display = "none";
                        return;
                    }
                    
                    var v = plot._dataSource.getValue(t);
                    if (plot._plotInfo.roundValues) v = Math.round(v);
                    plot._valueFlag.innerHTML = new String(v);
                    var d = new Date(t);
                    var p = plot._timeGeometry.getPeriod(); 
                    if (p < day) {
                        plot._timeFlag.innerHTML = d.toLocaleTimeString();
                    } else if (p > month) {
                        plot._timeFlag.innerHTML = d.toLocaleDateString();
                    } else {
                        plot._timeFlag.innerHTML = d.formatDate("MM/dd/yy hh:mmt");
                    }

                    var tw = plot._timeFlag.clientWidth;
                    var th = plot._timeFlag.clientHeight;
                    var tdw = Math.round(tw / 2);
                    var vw = plot._valueFlag.clientWidth;
                    var vh = plot._valueFlag.clientHeight;
                    var y = plot._valueGeometry.toScreen(v);

                    if (x + tdw > c.width) {
                        var tx = c.width - tdw;
                    } else if (x - tdw < 0) {
                        var tx = tdw;
                    } else {
                        var tx = x;
                    }

                    if (plot._timeGeometry._timeValuePosition == "top") {
                        plot._timeplot.placeDiv(plot._valueFlagPole, {
                            left: x,
                            top: th - 5,
                            height: c.height - y - th + 6,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._timeFlag,{
                            left: tx - tdw,
                            top: -6,
                            display: "block"
                        });
                    } else {
                        plot._timeplot.placeDiv(plot._valueFlagPole, {
                            left: x,
                            bottom: th - 5,
                            height: y - th + 6,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._timeFlag,{
                            left: tx - tdw,
                            bottom: -6,
                            display: "block"
                        });
                    }

                    if (x + vw + 14 > c.width && y + vh + 4 > c.height) {
                        plot._valueFlagLineLeft.style.display = "none";
                        plot._timeplot.placeDiv(plot._valueFlagLineRight,{
                            left: x - 14,
                            bottom: y - 14,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._valueFlag,{
                            left: x - vw - 13,
                            bottom: y - vh - 13,
                            display: "block"
                        });
                    } else if (x + vw + 14 > c.width && y + vh + 4 < c.height) {
                        plot._valueFlagLineRight.style.display = "none";
                        plot._timeplot.placeDiv(plot._valueFlagLineLeft,{
                            left: x - 14,
                            bottom: y,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._valueFlag,{
                            left: x - vw - 13,
                            bottom: y + 13,
                            display: "block"
                        });
                    } else if (x + vw + 14 < c.width && y + vh + 4 > c.height) {
                        plot._valueFlagLineRight.style.display = "none";
                        plot._timeplot.placeDiv(plot._valueFlagLineLeft,{
                            left: x,
                            bottom: y - 13,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._valueFlag,{
                            left: x + 13,
                            bottom: y - 13,
                            display: "block"
                        });
                    } else {
                        plot._valueFlagLineLeft.style.display = "none";
                        plot._timeplot.placeDiv(plot._valueFlagLineRight,{
                            left: x,
                            bottom: y,
                            display: "block"
                        });
                        plot._timeplot.placeDiv(plot._valueFlag,{
                            left: x + 13,
                            bottom: y + 13,
                            display: "block"
                        });
                    }
                }
            }

            var timeplotElement = this._timeplot.getElement();
            SimileAjax.DOM.registerEvent(timeplotElement, "mouseover", mouseOverHandler);
            SimileAjax.DOM.registerEvent(timeplotElement, "mousemove", mouseMoveHandler);
        }
    },

    /**
     * Dispose the plot layer and all the data sources and listeners associated to it
     */
    dispose: function() {
        if (this._dataSource) {
            this._dataSource.removeListener(this._paintingListener);
            this._paintingListener = null;
            this._dataSource.dispose();
            this._dataSource = null;
        }
    },

    /**
     * Hide the values
     */
    hideValues: function() {
        if (this._valueFlag) this._valueFlag.style.display = "none";
        if (this._timeFlag) this._timeFlag.style.display = "none";
        if (this._valueFlagLineLeft) this._valueFlagLineLeft.style.display = "none";
        if (this._valueFlagLineRight) this._valueFlagLineRight.style.display = "none";
        if (this._valueFlagPole) this._valueFlagPole.style.display = "none";
    },
    
    /**
     * Return the data source of this plot layer (it could be either a DataSource or an EventSource)
     */
    getDataSource: function() {
        return (this._dataSource) ? this._dataSource : this._eventSource;
    },

    /**
     * Return the time geometry associated with this plot layer
     */
    getTimeGeometry: function() {
        return this._timeGeometry;
    },

    /**
     * Return the value geometry associated with this plot layer
     */
    getValueGeometry: function() {
        return this._valueGeometry;
    },

    /**
     * Paint this plot layer
     */
    paint: function() {
        var ctx = this._canvas.getContext('2d');

        ctx.lineWidth = this._plotInfo.lineWidth;
        ctx.lineJoin = 'miter';

        if (this._dataSource) {     
            if (this._plotInfo.fillColor) {
                if (this._plotInfo.fillGradient) {
                    var gradient = ctx.createLinearGradient(0,this._canvas.height,0,0);
                    gradient.addColorStop(0,this._plotInfo.fillColor.toString());
                    gradient.addColorStop(0.5,this._plotInfo.fillColor.toString());
                    gradient.addColorStop(1, 'rgba(255,255,255,0)');

                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = this._plotInfo.fillColor.toString();
                }

                ctx.beginPath();
                ctx.moveTo(0,0);
                this._plot(function(x,y) {
                    ctx.lineTo(x,y);
                });
                if (this._plotInfo.fillFrom == Number.NEGATIVE_INFINITY) {
                    ctx.lineTo(this._canvas.width, 0);
                } else if (this._plotInfo.fillFrom == Number.POSITIVE_INFINITY) {
                    ctx.lineTo(this._canvas.width, this._canvas.height);
                    ctx.lineTo(0, this._canvas.height);
                } else {
                    ctx.lineTo(this._canvas.width, this._valueGeometry.toScreen(this._plotInfo.fillFrom));
                    ctx.lineTo(0, this._valueGeometry.toScreen(this._plotInfo.fillFrom));
                }
                ctx.fill();
            }
                    
            if (this._plotInfo.lineColor) {
                ctx.strokeStyle = this._plotInfo.lineColor.toString();
                ctx.beginPath();
                var first = true;
                this._plot(function(x,y) {
                        if (first) {
                             first = false;
                             ctx.moveTo(x,y);
                        }
                    ctx.lineTo(x,y);
                });
                ctx.stroke();
            }

            if (this._plotInfo.dotColor) {
                ctx.fillStyle = this._plotInfo.dotColor.toString();
                var r = this._plotInfo.dotRadius;
                this._plot(function(x,y) {
                    ctx.beginPath();
                    ctx.arc(x,y,r,0,2*Math.PI,true);
                    ctx.fill();
                });
            }
        }

        if (this._eventSource) {
            var gradient = ctx.createLinearGradient(0,0,0,this._canvas.height);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.strokeStyle = gradient;
            ctx.fillStyle = gradient; 
            ctx.lineWidth = this._plotInfo.eventLineWidth;
            ctx.lineJoin = 'miter';
            
            var i = this._eventSource.getAllEventIterator();
            while (i.hasNext()) {
                var event = i.next();
                var color = event.getColor();
                color = (color) ? new Timeplot.Color(color) : this._plotInfo.lineColor;
                var eventStart = event.getStart().getTime();
                var eventEnd = event.getEnd().getTime();
                if (eventStart == eventEnd) {
                    var c = color.toString();
                    gradient.addColorStop(0, c);
                    var start = this._timeGeometry.toScreen(eventStart);
                    start = Math.floor(start) + 0.5; // center it between two pixels (makes the rendering nicer)
                    var end = start;
                    ctx.beginPath();
                    ctx.moveTo(start,0);
                    ctx.lineTo(start,this._canvas.height);
                    ctx.stroke();
                    var x = start - 4;
                    var w = 7;
                } else {
                    var c = color.toString(0.5);
                    gradient.addColorStop(0, c);
                    var start = this._timeGeometry.toScreen(eventStart);
                    start = Math.floor(start) + 0.5; // center it between two pixels (makes the rendering nicer)
                    var end = this._timeGeometry.toScreen(eventEnd);
                    end = Math.floor(end) + 0.5; // center it between two pixels (makes the rendering nicer)
                    ctx.fillRect(start,0,end - start, this._canvas.height);
                    var x = start;
                    var w = end - start - 1;
                }

                var div = this._timeplot.putDiv(event.getID(),"timeplot-event-box",{
                    left: Math.round(x),
                    width: Math.round(w),
                    top: 0,
                    height: this._canvas.height - 1
                });

                var plot = this;
                var clickHandler = function(event) { 
                    return function(elmt, evt, target) { 
                        var doc = plot._timeplot.getDocument();
                        plot._closeBubble();
                        var coords = SimileAjax.DOM.getEventPageCoordinates(evt);
                        var elmtCoords = SimileAjax.DOM.getPageCoordinates(elmt);
                        plot._bubble = SimileAjax.Graphics.createBubbleForPoint(coords.x, elmtCoords.top + plot._canvas.height, plot._plotInfo.bubbleWidth, plot._plotInfo.bubbleHeight, "bottom");
                        event.fillInfoBubble(plot._bubble.content, plot._theme, plot._timeGeometry.getLabeler());
                    }
                };
                var mouseOverHandler = function(elmt, evt, target) {
                    elmt.oldClass = elmt.className;
                    elmt.className = elmt.className + " timeplot-event-box-highlight";
                };
                var mouseOutHandler = function(elmt, evt, target) {
                    elmt.className = elmt.oldClass;
                    elmt.oldClass = null;
                }
                
                if (!div.instrumented) {
                    SimileAjax.DOM.registerEvent(div, "click"    , clickHandler(event));
                    SimileAjax.DOM.registerEvent(div, "mouseover", mouseOverHandler);
                    SimileAjax.DOM.registerEvent(div, "mouseout" , mouseOutHandler);
                    div.instrumented = true;
                }
            }
        }
    },

    _plot: function(f) {
        var data = this._dataSource.getData();
        if (data) {
            var times = data.times;
            var values = data.values;
            var T = times.length;
            for (var t = 0; t < T; t++) {
                var x = this._timeGeometry.toScreen(times[t]);
                var y = this._valueGeometry.toScreen(values[t]);
                f(x, y);
            }
        }
    },
    
    _closeBubble: function() {
        if (this._bubble != null) {
            this._bubble.close();
            this._bubble = null;
        }
    }

}

//SOURCES.JS
/**
 * Sources
 * 
 * @fileOverview Sources
 * @name Sources
 */

/**
 * Timeplot.DefaultEventSource is an extension of Timeline.DefaultEventSource
 * and therefore reuses the exact same event loading subsystem that
 * Timeline uses.
 * 
 * @constructor
 */
Timeplot.DefaultEventSource = function(eventIndex) {
    Timeline.DefaultEventSource.apply(this, arguments);
};

Object.extend(Timeplot.DefaultEventSource.prototype, Timeline.DefaultEventSource.prototype);

/**
 * Function used by Timeplot to load time series data from a text file.
 */
Timeplot.DefaultEventSource.prototype.loadText = function(text, separator, url, filter, format) {

    if (text == null) {
        return;
    }

    this._events.maxValues = new Array();
    var base = this._getBaseURL(url);

    if (!format) format = 'iso8601';
    var parseDateTimeFunction = this._events.getUnit().getParser(format);

    var data = this._parseText(text, separator);

    var added = false;

    if (filter) {
        data = filter(data);
    }

    if (data) {
        for (var i = 0; i < data.length; i++){
            var row = data[i];
            if (row.length > 1) {
                var dateStr = SimileAjax.jQuery.trim(row[0]);
                var date = parseDateTimeFunction(dateStr);
                if (date) {
                    var evt = new Timeplot.DefaultEventSource.NumericEvent(date,row.slice(1));
                    this._events.add(evt);
                    added = true;
                }
            }
        }
    }

    if (added) {
        this._fire("onAddMany", []);
    }
}

/**
 * Takes a JSON object with date key and array value pairs.
 * 
 * {'YYYY-MM-DD': [val1, val2 ... valn], 'YYYY-MM-DD': [], ...}
 *
 * @param data The JSON object
 * @param format the Date format, defaults to 'iso8601'
 */
Timeplot.DefaultEventSource.prototype.loadJSON = function(data, format) {
	format = format || 'iso8601';
    var parseDateTimeFunction = this._events.getUnit().getParser(format);
    var added = false;

	if(data) {
		this._events.maxValues = [];
		for(var i in data) {
			var date = parseDateTimeFunction(i);
			if(date) {
				var evt = new Timeplot.DefaultEventSource.NumericEvent(date, data[i]);
				this._events.add(evt);
				added = true;
			}
		}
	}
	
	if(added) {
        this._fire("onAddMany", []);
    }
}

/*
 * Parse the data file.
 * 
 * Adapted from http://www.kawa.net/works/js/jkl/js/jkl-parsexml.js by Yusuke Kawasaki
 */
Timeplot.DefaultEventSource.prototype._parseText = function (text, separator) {
    text = text.replace( /\r\n?/g, "\n" ); // normalize newlines
    var pos = 0;
    var len = text.length;
    var table = [];
    while (pos < len) {
        var line = [];
        if (text.charAt(pos) != '#') { // if it's not a comment, process
            while (pos < len) {
                if (text.charAt(pos) == '"') {            // "..." quoted column
                    var nextquote = text.indexOf('"', pos+1 );
                    while (nextquote<len && nextquote > -1) {
                        if (text.charAt(nextquote+1) != '"') {
                            break;                          // end of column
                        }
                        nextquote = text.indexOf('"', nextquote + 2);
                    }
                    if ( nextquote < 0 ) {
                        // unclosed quote
                    } else if (text.charAt(nextquote + 1) == separator) { // end of column
                        var quoted = text.substr(pos + 1, nextquote-pos - 1);
                        quoted = quoted.replace(/""/g,'"');
                        line[line.length] = quoted;
                        pos = nextquote + 2;
                        continue;
                    } else if (text.charAt(nextquote + 1) == "\n" || // end of line
                               len == nextquote + 1 ) {              // end of file
                        var quoted = text.substr(pos + 1, nextquote-pos - 1);
                        quoted = quoted.replace(/""/g,'"');
                        line[line.length] = quoted;
                        pos = nextquote + 2;
                        break;
                    } else {
                        // invalid column
                    }
                }
                var nextseparator = text.indexOf(separator, pos);
                var nextnline = text.indexOf("\n", pos);
                if (nextnline < 0) nextnline = len;
                if (nextseparator > -1 && nextseparator < nextnline) {
                    line[line.length] = text.substr(pos, nextseparator-pos);
                    pos = nextseparator + 1;
                } else {                                    // end of line
                    line[line.length] = text.substr(pos, nextnline-pos);
                    pos = nextnline + 1;
                    break;
                }
            }
        } else { // if it's a comment, ignore
            var nextnline = text.indexOf("\n", pos);
            pos = (nextnline > -1) ? nextnline + 1 : cur;
        }
        if (line.length > 0) {
            table[table.length] = line;                 // push line
        }
    }
    if (table.length < 0) return;                     // null data
    return table;
}

/**
 * Return the range of the loaded data
 */
Timeplot.DefaultEventSource.prototype.getRange = function() {
    var earliestDate = this.getEarliestDate();
    var latestDate = this.getLatestDate();
    return {
        earliestDate: (earliestDate) ? earliestDate : null,
        latestDate: (latestDate) ? latestDate : null,
        min: 0,
        max: 0
    };
}

// -----------------------------------------------------------------------

/**
 * A NumericEvent is an Event that also contains an array of values, 
 * one for each columns in the loaded data file.
 * 
 * @constructor
 */
Timeplot.DefaultEventSource.NumericEvent = function(time, values) {
    this._id = "e" + Math.round(Math.random() * 1000000);
    this._time = time;
    this._values = values;
};

Timeplot.DefaultEventSource.NumericEvent.prototype = {
    getID:          function() { return this._id; },
    getTime:        function() { return this._time; },
    getValues:      function() { return this._values; },

    // these are required by the EventSource
    getStart:       function() { return this._time; },
    getEnd:         function() { return this._time; }
};

// -----------------------------------------------------------------------

/**
 * A DataSource represent an abstract class that represents a monodimensional time series.
 * 
 * @constructor
 */
Timeplot.DataSource = function(eventSource) {
    this._eventSource = eventSource;
    var source = this;
    this._processingListener = {
        onAddMany: function() { source._process(); },
        onClear:   function() { source._clear(); }
    }
    this.addListener(this._processingListener);
    this._listeners = [];
    this._data = null;
    this._range = null;
};

Timeplot.DataSource.prototype = {
  
    _clear: function() {
        this._data = null;
        this._range = null;
    },

    _process: function() {
        this._data = {
            times: new Array(),
            values: new Array()
        };
        this._range = {
            earliestDate: null,
            latestDate: null,
            min: 0,
            max: 0
        };
    },

    /**
     * Return the range of this data source
     */
    getRange: function() {
        return this._range;
    },

    /**
     * Return the actual data that this data source represents.
     * NOTE: _data = { times: [], values: [] }
     */
    getData: function() {
        return this._data;
    },
    
    /**
     * Return the value associated with the given time in this time series
     */
    getValue: function(t) {
        if (this._data) {
            for (var i = 0; i < this._data.times.length; i++) {
                var l = this._data.times[i];
                if (l >= t) {
                    return this._data.values[i];
                }
            }
        }
        return 0;
    },

    /**
     * Add a listener to the underlying event source
     */
    addListener: function(listener) {
        this._eventSource.addListener(listener);
    },

    /**
     * Remove a listener from the underlying event source
     */
    removeListener: function(listener) {
        this._eventSource.removeListener(listener);
    },

    /**
     * Replace a listener from the underlying event source
     */
    replaceListener: function(oldListener, newListener) {
        this.removeListener(oldListener);
        this.addListener(newListener);
    }

}

// -----------------------------------------------------------------------

/**
 * Implementation of a DataSource that extracts the time series out of a 
 * single column from the events
 * 
 * @constructor
 */
Timeplot.ColumnSource = function(eventSource, column) {
    Timeplot.DataSource.apply(this, arguments);
    this._column = column - 1;
};

Object.extend(Timeplot.ColumnSource.prototype,Timeplot.DataSource.prototype);

Timeplot.ColumnSource.prototype.dispose = function() {
    this.removeListener(this._processingListener);
    this._clear();
}

Timeplot.ColumnSource.prototype._process = function() {
    var count = this._eventSource.getCount();
    var times = new Array(count);
    var values = new Array(count);
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;
    var i = 0;

    var iterator = this._eventSource.getAllEventIterator();
    while (iterator.hasNext()) {
        var event = iterator.next();
        var time = event.getTime();
        times[i] = time;
        var value = this._getValue(event);
        if (!isNaN(value)) {
           if (value < min) {
               min = value;
           }
           if (value > max) {
               max = value;
           }    
            values[i] = value;
        }
        i++;
    }

    this._data = {
        times: times,
        values: values
    };

    if (max == Number.MIN_VALUE) max = 1;
    
    this._range = {
        earliestDate: this._eventSource.getEarliestDate(),
        latestDate: this._eventSource.getLatestDate(),
        min: min,
        max: max
    };
}

Timeplot.ColumnSource.prototype._getValue = function(event) {
    return parseFloat(event.getValues()[this._column]);
}

// ---------------------------------------------------------------

/**
 * Data Source that generates the time series out of the difference
 * between the first and the second column
 * 
 * @constructor
 */
Timeplot.ColumnDiffSource = function(eventSource, column1, column2) {
    Timeplot.ColumnSource.apply(this, arguments);
    this._column2 = column2 - 1;
};

Object.extend(Timeplot.ColumnDiffSource.prototype,Timeplot.ColumnSource.prototype);

Timeplot.ColumnDiffSource.prototype._getValue = function(event) {
    var a = parseFloat(event.getValues()[this._column]);
    var b = parseFloat(event.getValues()[this._column2]);
    return a - b;
}


//GEOMETRY.JS
/**
 * Geometries
 * 
 * @fileOverview Geometries
 * @name Geometries
 */

/**
 * This is the constructor for the default value geometry.
 * A value geometry is what regulates mapping of the plot values to the screen y coordinate.
 * If two plots share the same value geometry, they will be drawn using the same scale.
 * If "min" and "max" parameters are not set, the geometry will stretch itself automatically
 * so that the entire plot will be drawn without overflowing. The stretching happens also
 * when a geometry is shared between multiple plots, the one with the biggest range will
 * win over the others.
 * 
 * @constructor
 */
Timeplot.DefaultValueGeometry = function(params) {
    if (!params) params = {};
    this._id = ("id" in params) ? params.id : "g" + Math.round(Math.random() * 1000000);
    this._axisColor = ("axisColor" in params) ? ((typeof params.axisColor == "string") ? new Timeplot.Color(params.axisColor) : params.axisColor) : new Timeplot.Color("#606060"),
    this._gridColor = ("gridColor" in params) ? ((typeof params.gridColor == "string") ? new Timeplot.Color(params.gridColor) : params.gridColor) : null,
    this._gridLineWidth = ("gridLineWidth" in params) ? params.gridLineWidth : 0.5;
    this._axisLabelsPlacement = ("axisLabelsPlacement" in params) ? params.axisLabelsPlacement : "right";
    this._gridSpacing = ("gridSpacing" in params) ? params.gridStep : 50;
    this._gridType = ("gridType" in params) ? params.gridType : "short";
    this._gridShortSize = ("gridShortSize" in params) ? params.gridShortSize : 10;
    this._minValue = ("min" in params) ? params.min : null;
    this._maxValue = ("max" in params) ? params.max : null;
    this._linMap = {
        direct: function(v) {
            return v;
        },
        inverse: function(y) {
            return y;
        }
    }
    this._map = this._linMap;
    this._labels = [];
    this._grid = [];
}

Timeplot.DefaultValueGeometry.prototype = {

    /**
     * Since geometries can be reused across timeplots, we need to call this function
     * before we can paint using this geometry.
     */
    setTimeplot: function(timeplot) {
        this._timeplot = timeplot;
        this._canvas = timeplot.getCanvas();
        this.reset();
    },

    /**
     * Called by all the plot layers this geometry is associated with
     * to update the value range. Unless min/max values are specified
     * in the parameters, the biggest value range will be used.
     */
    setRange: function(range) {
        if ((this._minValue == null) || ((this._minValue != null) && (range.min < this._minValue))) {
            this._minValue = range.min;
        }
        if ((this._maxValue == null) || ((this._maxValue != null) && (range.max * 1.05 > this._maxValue))) {
            this._maxValue = range.max * 1.05; // get a little more head room to avoid hitting the ceiling
        }

        this._updateMappedValues();

        if (!(this._minValue == 0 && this._maxValue == 0)) {
            this._grid = this._calculateGrid();
        }
    },

    /**
     * Called after changing ranges or canvas size to reset the grid values
     */
    reset: function() {
        this._clearLabels();
        this._updateMappedValues();
        this._grid = this._calculateGrid();
    },

    /**
     * Map the given value to a y screen coordinate.
     */
    toScreen: function(value) {
        if (this._canvas && this._maxValue) {
            var v = value - this._minValue;
            return this._canvas.height * (this._map.direct(v)) / this._mappedRange;
        } else {
            return -50;
        }
    },

    /**
     * Map the given y screen coordinate to a value
     */
    fromScreen: function(y) {
        if (this._canvas) {
            return this._map.inverse(this._mappedRange * y / this._canvas.height) + this._minValue;
        } else {
            return 0;
        }
    },

    /**
     * Each geometry is also a painter and paints the value grid and grid labels.
     */
    paint: function() {
        if (this._timeplot) {
            var ctx = this._canvas.getContext('2d');
    
            ctx.lineJoin = 'miter';
    
            // paint grid
            if (this._gridColor) {        
                var gridGradient = ctx.createLinearGradient(0,0,0,this._canvas.height);
                gridGradient.addColorStop(0, this._gridColor.toHexString());
                gridGradient.addColorStop(0.3, this._gridColor.toHexString());
                gridGradient.addColorStop(1, "rgba(255,255,255,0.5)");

                ctx.lineWidth = this._gridLineWidth;
                ctx.strokeStyle = gridGradient;
    
                for (var i = 0; i < this._grid.length; i++) {
                    var tick = this._grid[i];
                    var y = Math.floor(tick.y) + 0.5;
                    if (typeof tick.label != "undefined") {
                        if (this._axisLabelsPlacement == "left") {
                            var div = this._timeplot.putText(this._id + "-" + i, tick.label,"timeplot-grid-label",{
                                left: 4,
                                bottom: y + 2,
                                color: this._gridColor.toHexString(),
                                visibility: "hidden"
                            });
                        } else if (this._axisLabelsPlacement == "right") {
                            var div = this._timeplot.putText(this._id + "-" + i, tick.label, "timeplot-grid-label",{
                                right: 4,
                                bottom: y + 2,
                                color: this._gridColor.toHexString(),
                                visibility: "hidden"
                            });
                        }
                        if (y + div.clientHeight < this._canvas.height + 10) {
                            div.style.visibility = "visible"; // avoid the labels that would overflow
                        }
                    }

                    // draw grid
                    ctx.beginPath();
                    if (this._gridType == "long" || tick.label == 0) {
                        ctx.moveTo(0, y);
                        ctx.lineTo(this._canvas.width, y);
                    } else if (this._gridType == "short") {
                        if (this._axisLabelsPlacement == "left") {
                            ctx.moveTo(0, y);
                            ctx.lineTo(this._gridShortSize, y);
                        } else if (this._axisLabelsPlacement == "right") {
                            ctx.moveTo(this._canvas.width, y);
                            ctx.lineTo(this._canvas.width - this._gridShortSize, y);
                        }                       
                    }
                    ctx.stroke();
                }
            }
        
            // paint axis
            var axisGradient = ctx.createLinearGradient(0,0,0,this._canvas.height);
            axisGradient.addColorStop(0, this._axisColor.toString());
            axisGradient.addColorStop(0.5, this._axisColor.toString());
            axisGradient.addColorStop(1, "rgba(255,255,255,0.5)");
            
            ctx.lineWidth = 1;
            ctx.strokeStyle = axisGradient;
    
            // left axis
            ctx.beginPath();
            ctx.moveTo(0,this._canvas.height);
            ctx.lineTo(0,0);
            ctx.stroke();
            
            // right axis
            ctx.beginPath();
            ctx.moveTo(this._canvas.width,0);
            ctx.lineTo(this._canvas.width,this._canvas.height);
            ctx.stroke();
        }
    },
    
    /**
     * Removes all the labels that were added by this geometry
     */
    _clearLabels: function() {
        for (var i = 0; i < this._labels.length; i++) {
            var l = this._labels[i];
            var parent = l.parentNode;
            if (parent) parent.removeChild(l);
        }
    },
	
    _round: function(x,n) {
		if (n > 0) {
			var d = Math.pow(10, n);
			var val = Math.round(x * d) / d;
			if (Math.abs(val) > 0)
				return val;
		}
		return x;
	},
    
    /*
     * This function calculates the grid spacing that it will be used 
     * by this geometry to draw the grid in order to reduce clutter. 
     */
    _calculateGrid: function() {
        var grid = [];
        
        if (!this._canvas || this._valueRange == 0) return grid;
                
        var power = 0;
        if (this._valueRange > 1) {
            while (Math.pow(10,power) < this._valueRange) {
                power++;
            }
            power--;
        } else {
            while (Math.pow(10,power) > this._valueRange) {
                power--;
            }
        }

        var unit = Math.pow(10,power);
        var inc = unit;
        while (true) {
            var dy = this.toScreen(this._minValue + inc);

            while (dy < this._gridSpacing) {
                inc += unit;
                dy = this.toScreen(this._minValue + inc);
            }

            if (dy > 2 * this._gridSpacing) { // grids are too spaced out
                unit /= 10;
                inc = unit;
            } else {
                break;
            }
        }
        
        var v = 0;
        var y = this.toScreen(v);
        if (this._minValue >= 0) {
            while (y < this._canvas.height) {
                if (y > 0) {
                    grid.push({ y: y, label: v });
                }
                v += inc;
				v = this._round(v, 3);
                y = this.toScreen(v);
            }
        } else if (this._maxValue <= 0) {
            while (y > 0) {
                if (y < this._canvas.height) {
                    grid.push({ y: y, label: v });
                }
                v -= inc;
                y = this.toScreen(v);
            }
        } else {
            while (y < this._canvas.height) {
                if (y > 0) {
                    grid.push({ y: y, label: v });
                }
                v += inc;
                y = this.toScreen(v);
            }
            v = -inc;
            y = this.toScreen(v);
            while (y > 0) {
                if (y < this._canvas.height) {
                    grid.push({ y: y, label: v });
                }
                v -= inc;
                y = this.toScreen(v);
            }
        }
        
        return grid;
    },

    /*
     * Update the values that are used by the paint function so that
     * we don't have to calculate them at every repaint.
     */
    _updateMappedValues: function() {
        this._valueRange = Math.abs(this._maxValue - this._minValue);
        this._mappedRange = this._map.direct(this._valueRange);
    }
    
}

// --------------------------------------------------

/**
 * This is the constructor for a Logarithmic value geometry, which
 * is useful when plots have values in different magnitudes but 
 * exhibit similar trends and such trends want to be shown on the same
 * plot (here a cartesian geometry would make the small magnitudes 
 * disappear).
 * 
 * NOTE: this class extends Timeplot.DefaultValueGeometry and inherits
 * all of the methods of that class. So refer to that class. 
 * 
 * @constructor
 */
Timeplot.LogarithmicValueGeometry = function(params) {
    Timeplot.DefaultValueGeometry.apply(this, arguments);
    this._logMap = {
        direct: function(v) {
            return Math.log(v + 1) / Math.log(10);
        },
        inverse: function(y) {
            return Math.exp(Math.log(10) * y) - 1;
        }
    }
    this._mode = "log";
    this._map = this._logMap;
    this._calculateGrid = this._logarithmicCalculateGrid;
};

Timeplot.LogarithmicValueGeometry.prototype._linearCalculateGrid = Timeplot.DefaultValueGeometry.prototype._calculateGrid;

Object.extend(Timeplot.LogarithmicValueGeometry.prototype,Timeplot.DefaultValueGeometry.prototype);

/*
 * This function calculates the grid spacing that it will be used 
 * by this geometry to draw the grid in order to reduce clutter. 
 */
Timeplot.LogarithmicValueGeometry.prototype._logarithmicCalculateGrid = function() {
    var grid = [];
    
    if (!this._canvas || this._valueRange == 0) return grid;

    var v = 1;
    var y = this.toScreen(v);
    while (y < this._canvas.height || isNaN(y)) {
        if (y > 0) {
            grid.push({ y: y, label: v });
        }
        v *= 10;
        y = this.toScreen(v);
    }
    
    return grid;
};

/**
 * Turn the logarithmic scaling off. 
 */
Timeplot.LogarithmicValueGeometry.prototype.actLinear = function() {
    this._mode = "lin";
    this._map = this._linMap;
    this._calculateGrid = this._linearCalculateGrid;
    this.reset();
}

/**
 * Turn the logarithmic scaling on. 
 */
Timeplot.LogarithmicValueGeometry.prototype.actLogarithmic = function() {
    this._mode = "log";
    this._map = this._logMap;
    this._calculateGrid = this._logarithmicCalculateGrid;
    this.reset();
}

/**
 * Toggle logarithmic scaling seeting it to on if off and viceversa. 
 */
Timeplot.LogarithmicValueGeometry.prototype.toggle = function() {
    if (this._mode == "log") {
        this.actLinear();
    } else {
        this.actLogarithmic();
    }
}

// -----------------------------------------------------

/**
 * This is the constructor for the default time geometry.
 * 
 * @constructor
 */
Timeplot.DefaultTimeGeometry = function(params) {
    if (!params) params = {};
    this._id = ("id" in params) ? params.id : "g" + Math.round(Math.random() * 1000000);
    this._locale = ("locale" in params) ? params.locale : "en";
    this._timeZone = ("timeZone" in params) ? params.timeZone : SimileAjax.DateTime.getTimezone();
    this._labeller = ("labeller" in params) ? params.labeller : null;
    this._axisColor = ("axisColor" in params) ? ((params.axisColor == "string") ? new Timeplot.Color(params.axisColor) : params.axisColor) : new Timeplot.Color("#606060"),
    this._gridColor = ("gridColor" in params) ? ((params.gridColor == "string") ? new Timeplot.Color(params.gridColor) : params.gridColor) : null,
    this._gridLineWidth = ("gridLineWidth" in params) ? params.gridLineWidth : 0.5;
    this._axisLabelsPlacement = ("axisLabelsPlacement" in params) ? params.axisLabelsPlacement : "bottom";
    this._gridStep = ("gridStep" in params) ? params.gridStep : 100;
    this._gridStepRange = ("gridStepRange" in params) ? params.gridStepRange : 20;
    this._min = ("min" in params) ? params.min : null;
    this._max = ("max" in params) ? params.max : null;
    this._timeValuePosition =("timeValuePosition" in params) ? params.timeValuePosition : "bottom";
    this._unit = ("unit" in params) ? params.unit : Timeline.NativeDateUnit;
    this._linMap = {
        direct: function(t) {
            return t;
        },
        inverse: function(x) {
            return x;
        }
    }
    this._map = this._linMap;
    this._labeler = this._unit.createLabeller(this._locale, this._timeZone);
    var dateParser = this._unit.getParser("iso8601");
    if (this._min && !this._min.getTime) {
        this._min = dateParser(this._min);
    }
    if (this._max && !this._max.getTime) {
        this._max = dateParser(this._max);
    }
    this._grid = [];
}

Timeplot.DefaultTimeGeometry.prototype = {

    /**
     * Since geometries can be reused across timeplots, we need to call this function
     * before we can paint using this geometry.
     */
    setTimeplot: function(timeplot) {
        this._timeplot = timeplot;
        this._canvas = timeplot.getCanvas();
        this.reset();
    },

    /**
     * Called by all the plot layers this geometry is associated with
     * to update the time range. Unless min/max values are specified
     * in the parameters, the biggest range will be used.
     */
    setRange: function(range) {
        if (this._min) {
            this._earliestDate = this._min;
        } else if (range.earliestDate && ((this._earliestDate == null) || ((this._earliestDate != null) && (range.earliestDate.getTime() < this._earliestDate.getTime())))) {
            this._earliestDate = range.earliestDate;
        }
        
        if (this._max) {
            this._latestDate = this._max;
        } else if (range.latestDate && ((this._latestDate == null) || ((this._latestDate != null) && (range.latestDate.getTime() > this._latestDate.getTime())))) {
            this._latestDate = range.latestDate;
        }

        if (!this._earliestDate && !this._latestDate) {
            this._grid = [];
        } else {
            this.reset(); 
        }
    },
    
    /**
     * Called after changing ranges or canvas size to reset the grid values
     */
    reset: function() {
        this._updateMappedValues();
        if (this._canvas) this._grid = this._calculateGrid();
    },
    
    /**
     * Map the given date to a x screen coordinate.
     */
    toScreen: function(time) {
        if (this._canvas && this._latestDate) {
            var t = time - this._earliestDate.getTime();
            return this._canvas.width * this._map.direct(t) / this._mappedPeriod;
        } else {
            return -50;
        } 
    },

    /**
     * Map the given x screen coordinate to a date.
     */
    fromScreen: function(x) {
        if (this._canvas) {
            return this._map.inverse(this._mappedPeriod * x / this._canvas.width) + this._earliestDate.getTime();
        } else {
            return 0;
        } 
    },
    
    /**
     * Get a period (in milliseconds) this time geometry spans.
     */
    getPeriod: function() {
        return this._period;
    },
    
    /**
     * Return the labeler that has been associated with this time geometry
     */
    getLabeler: function() {
        return this._labeler;
    },

    /**
     * Return the time unit associated with this time geometry
     */
    getUnit: function() {
        return this._unit;
    },

   /**
    * Each geometry is also a painter and paints the value grid and grid labels.
    */
    paint: function() {
        if (this._canvas) {
            var unit = this._unit;
            var ctx = this._canvas.getContext('2d');
    
            var gradient = ctx.createLinearGradient(0,0,0,this._canvas.height);
    
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this._gridLineWidth;
            ctx.lineJoin = 'miter';
    
            // paint grid
            if (this._gridColor) {        
                gradient.addColorStop(0, this._gridColor.toString());
                gradient.addColorStop(1, "rgba(255,255,255,0.9)");
    
                for (var i = 0; i < this._grid.length; i++) {
                    var tick = this._grid[i];
                    var x = Math.floor(tick.x) + 0.5;
                    if (this._axisLabelsPlacement == "top") {
                        var div = this._timeplot.putText(this._id + "-" + i, tick.label,"timeplot-grid-label",{
                            left: x + 4,
                            top: 2,
                            visibility: "hidden"
                        });
                    } else if (this._axisLabelsPlacement == "bottom") {
                        var div = this._timeplot.putText(this._id + "-" + i, tick.label, "timeplot-grid-label",{
                            left: x + 4,
                            bottom: 2,
                            visibility: "hidden"
                        });
                    }
                    if (x + div.clientWidth < this._canvas.width + 10) {
                        div.style.visibility = "visible"; // avoid the labels that would overflow
                    }

                    // draw separator
                    ctx.beginPath();
                    ctx.moveTo(x,0);
                    ctx.lineTo(x,this._canvas.height);
                    ctx.stroke();
                }
            }
    
            // paint axis
            gradient.addColorStop(0, this._axisColor.toString());
            gradient.addColorStop(1, "rgba(255,255,255,0.5)");
            
            ctx.lineWidth = 1;
            gradient.addColorStop(0, this._axisColor.toString());
    
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(this._canvas.width,0);
            ctx.stroke();
        }
    },
    
    /*
     * This function calculates the grid spacing that it will be used 
     * by this geometry to draw the grid in order to reduce clutter. 
     */
    _calculateGrid: function() {
        var grid = [];
        
        var time = SimileAjax.DateTime;
        var u = this._unit;
        var p = this._period;
        
        if (p == 0) return grid;
        
        // find the time units nearest to the time period
        if (p > time.gregorianUnitLengths[time.MILLENNIUM]) {
            unit = time.MILLENNIUM; 
        } else {
            for (var unit = time.MILLENNIUM; unit > 0; unit--) {
                if (time.gregorianUnitLengths[unit-1] <= p && p < time.gregorianUnitLengths[unit]) {
                    unit--;
                    break;
                }
            }
        }

        var t = u.cloneValue(this._earliestDate);

        do {
            time.roundDownToInterval(t, unit, this._timeZone, 1, 0);
            var x = this.toScreen(u.toNumber(t));
            switch (unit) {
                case time.SECOND:
                  var l = t.toLocaleTimeString();
                  break;
                case time.MINUTE:
                  var m = t.getMinutes();
                  var l = t.getHours() + ":" + ((m < 10) ? "0" : "") + m;
                  break;
                case time.HOUR:
                  var l = t.getHours() + ":00";
                  break;
                case time.DAY:
                case time.WEEK:
                case time.MONTH:
                  var l = t.toLocaleDateString();
                  break;  
                case time.YEAR:
                case time.DECADE:
                case time.CENTURY:
                case time.MILLENNIUM:
                  var l = t.getUTCFullYear();
                  break;
            }
            if (x > 0) { 
                grid.push({ x: x, label: l });
            }
            time.incrementByInterval(t, unit, this._timeZone);
        } while (t.getTime() < this._latestDate.getTime());
        
        return grid;
    },
        
    /*
     * Update the values that are used by the paint function so that
     * we don't have to calculate them at every repaint.
     */
    _updateMappedValues: function() {
        if (this._latestDate && this._earliestDate) {
            this._period = this._latestDate.getTime() - this._earliestDate.getTime();
            this._mappedPeriod = this._map.direct(this._period);
        } else {
            this._period = 0;
            this._mappedPeriod = 0;
        }
    }
    
}

// --------------------------------------------------------------

/**
 * This is the constructor for the magnifying time geometry.
 * Users can interact with this geometry and 'magnify' certain areas of the
 * plot to see the plot enlarged and resolve details that would otherwise
 * get lost or cluttered with a linear time geometry.
 * 
 * @constructor
 */
Timeplot.MagnifyingTimeGeometry = function(params) {
    Timeplot.DefaultTimeGeometry.apply(this, arguments);
        
    var g = this;
    this._MagnifyingMap = {
        direct: function(t) {
            if (t < g._leftTimeMargin) {
                var x = t * g._leftRate;
            } else if ( g._leftTimeMargin < t && t < g._rightTimeMargin ) {
                var x = t * g._expandedRate + g._expandedTimeTranslation;
            } else {
                var x = t * g._rightRate + g._rightTimeTranslation;
            }
            return x;
        },
        inverse: function(x) {
            if (x < g._leftScreenMargin) {
                var t = x / g._leftRate;
            } else if ( g._leftScreenMargin < x && x < g._rightScreenMargin ) {
                var t = x / g._expandedRate + g._expandedScreenTranslation;
            } else {
                var t = x / g._rightRate + g._rightScreenTranslation;
            }
            return t;
        }
    }

    this._mode = "lin";
    this._map = this._linMap;
};

Object.extend(Timeplot.MagnifyingTimeGeometry.prototype,Timeplot.DefaultTimeGeometry.prototype);

/**
 * Initialize this geometry associating it with the given timeplot and 
 * register the geometry event handlers to the timeplot so that it can
 * interact with the user.
 */
Timeplot.MagnifyingTimeGeometry.prototype.initialize = function(timeplot) {
    Timeplot.DefaultTimeGeometry.prototype.initialize.apply(this, arguments);

    if (!this._lens) {
        this._lens = this._timeplot.putDiv("lens","timeplot-lens");
    }

    var period = 1000 * 60 * 60 * 24 * 30; // a month in the magnifying lens

    var geometry = this;
    
    var magnifyWith = function(lens) {
        var aperture = lens.clientWidth;
        var loc = geometry._timeplot.locate(lens);
        geometry.setMagnifyingParams(loc.x + aperture / 2, aperture, period);
        geometry.actMagnifying();
        geometry._timeplot.paint();
    }
    
    var canvasMouseDown = function(elmt, evt, target) {
        geometry._canvas.startCoords = SimileAjax.DOM.getEventRelativeCoordinates(evt,elmt);
        geometry._canvas.pressed = true;
    }
    
    var canvasMouseUp = function(elmt, evt, target) {
        geometry._canvas.pressed = false;
        var coords = SimileAjax.DOM.getEventRelativeCoordinates(evt,elmt);
        if (Timeplot.Math.isClose(coords,geometry._canvas.startCoords,5)) {
            geometry._lens.style.display = "none";
            geometry.actLinear();
            geometry._timeplot.paint();
        } else {
            geometry._lens.style.cursor = "move";
            magnifyWith(geometry._lens);
        }
    }

    var canvasMouseMove = function(elmt, evt, target) {
        if (geometry._canvas.pressed) {
            var coords = SimileAjax.DOM.getEventRelativeCoordinates(evt,elmt);
            if (coords.x < 0) coords.x = 0;
            if (coords.x > geometry._canvas.width) coords.x = geometry._canvas.width;
            geometry._timeplot.placeDiv(geometry._lens, {
                left: geometry._canvas.startCoords.x,
                width: coords.x - geometry._canvas.startCoords.x,
                bottom: 0,
                height: geometry._canvas.height,
                display: "block"
            });
        }
    }

    var lensMouseDown = function(elmt, evt, target) {
        geometry._lens.startCoords = SimileAjax.DOM.getEventRelativeCoordinates(evt,elmt);;
        geometry._lens.pressed = true; 
    }
    
    var lensMouseUp = function(elmt, evt, target) {
        geometry._lens.pressed = false;
    }
    
    var lensMouseMove = function(elmt, evt, target) {
        if (geometry._lens.pressed) {
            var coords = SimileAjax.DOM.getEventRelativeCoordinates(evt,elmt);
            var lens = geometry._lens;
            var left = lens.offsetLeft + coords.x - lens.startCoords.x;
            if (left < geometry._timeplot._paddingX) left = geometry._timeplot._paddingX;
            if (left + lens.clientWidth > geometry._canvas.width - geometry._timeplot._paddingX) left = geometry._canvas.width - lens.clientWidth + geometry._timeplot._paddingX;
            lens.style.left = left;
            magnifyWith(lens);
        }
    }
    
    if (!this._canvas.instrumented) {
        SimileAjax.DOM.registerEvent(this._canvas, "mousedown", canvasMouseDown);
        SimileAjax.DOM.registerEvent(this._canvas, "mousemove", canvasMouseMove);
        SimileAjax.DOM.registerEvent(this._canvas, "mouseup"  , canvasMouseUp);
        SimileAjax.DOM.registerEvent(this._canvas, "mouseup"  , lensMouseUp);
        this._canvas.instrumented = true;
    }
    
    if (!this._lens.instrumented) {
        SimileAjax.DOM.registerEvent(this._lens, "mousedown", lensMouseDown);
        SimileAjax.DOM.registerEvent(this._lens, "mousemove", lensMouseMove);
        SimileAjax.DOM.registerEvent(this._lens, "mouseup"  , lensMouseUp);
        SimileAjax.DOM.registerEvent(this._lens, "mouseup"  , canvasMouseUp);
        this._lens.instrumented = true;
    }
}

/**
 * Set the Magnifying parameters. c is the location in pixels where the Magnifying
 * center should be located in the timeplot, a is the aperture in pixel of
 * the Magnifying and b is the time period in milliseconds that the Magnifying 
 * should span.
 */
Timeplot.MagnifyingTimeGeometry.prototype.setMagnifyingParams = function(c,a,b) {
    a = a / 2;
    b = b / 2;

    var w = this._canvas.width;
    var d = this._period;

    if (c < 0) c = 0;
    if (c > w) c = w;
    
    if (c - a < 0) a = c;
    if (c + a > w) a = w - c;
    
    var ct = this.fromScreen(c) - this._earliestDate.getTime();
    if (ct - b < 0) b = ct;
    if (ct + b > d) b = d - ct;

    this._centerX = c;
    this._centerTime = ct;
    this._aperture = a;
    this._aperturePeriod = b;
    
    this._leftScreenMargin = this._centerX - this._aperture;
    this._rightScreenMargin = this._centerX + this._aperture;
    this._leftTimeMargin = this._centerTime - this._aperturePeriod;
    this._rightTimeMargin = this._centerTime + this._aperturePeriod;
        
    this._leftRate = (c - a) / (ct - b);
    this._expandedRate = a / b;
    this._rightRate = (w - c - a) / (d - ct - b);

    this._expandedTimeTranslation = this._centerX - this._centerTime * this._expandedRate; 
    this._expandedScreenTranslation = this._centerTime - this._centerX / this._expandedRate;
    this._rightTimeTranslation = (c + a) - (ct + b) * this._rightRate;
    this._rightScreenTranslation = (ct + b) - (c + a) / this._rightRate;

    this._updateMappedValues();
}

/*
 * Turn magnification off.
 */
Timeplot.MagnifyingTimeGeometry.prototype.actLinear = function() {
    this._mode = "lin";
    this._map = this._linMap;
    this.reset();
}

/*
 * Turn magnification on.
 */
Timeplot.MagnifyingTimeGeometry.prototype.actMagnifying = function() {
    this._mode = "Magnifying";
    this._map = this._MagnifyingMap;
    this.reset();
}

/*
 * Toggle magnification.
 */
Timeplot.MagnifyingTimeGeometry.prototype.toggle = function() {
    if (this._mode == "Magnifying") {
        this.actLinear();
    } else {
        this.actMagnifying();
    }
}


//COLOR.JS
/**
 * Color
 *
 * @fileOverview Color
 * @name Color
 */

/*
 * Inspired by Plotr
 * Copyright 2007 (c) Bas Wenneker <sabmann[a]gmail[d]com>
 * For use under the BSD license. <http://www.solutoire.com/plotr>
 */

/**
 * Create a Color object that can be used to manipulate colors programmatically.
 */
Timeplot.Color = function(color) {
    this._fromHex(color);
};

Timeplot.Color.prototype = {

    /**
     * Sets the RGB values of this coor
     * 
     * @param {Number} r,g,b    Red green and blue values (between 0 and 255)
     */
    set: function (r,g,b,a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = (a) ? a : 1.0;
        return this.check();
    },

    /**
     * Set the color transparency
     * 
     * @param {float} a   Transparency value, between 0.0 (fully transparent) and 1.0 (fully opaque).
     */
    transparency: function(a) {
    	this.a = a;
    	return this.check();
    },
    
    /**
     * Lightens the color.
     * 
     * @param {integer} level   Level to lighten the color with.
     */
    lighten: function(level) {
        var color = new Timeplot.Color();
        return color.set(
            this.r += parseInt(level, 10),
            this.g += parseInt(level, 10),
            this.b += parseInt(level, 10)
        );
    },

    /**
     * Darkens the color.
     * 
     * @param {integer} level   Level to darken the color with.
     */
    darken: function(level){
        var color = new Timeplot.Color();
        return color.set(
            this.r -= parseInt(level, 10),
            this.g -= parseInt(level, 10),
            this.b -= parseInt(level, 10)
        );
    },

    /**
     * Checks and validates if the hex values r, g and b are
     * between 0 and 255.
     */
    check: function() {
        if (this.r > 255) { 
        	this.r = 255;
        } else if (this.r < 0){
        	this.r = 0;
        }
        if (this.g > 255) {
        	this.g = 255;
        } else if (this.g < 0) {
        	this.g = 0;
        }
        if (this.b > 255){
        	this.b = 255;
        } else if (this.b < 0){
        	this.b = 0;
        }
        if (this.a > 1.0){
            this.a = 1.0;
        } else if (this.a < 0.0){
            this.a = 0.0;
        }
        return this;
    },

    /**
     * Returns a string representation of this color.
     * 
     * @param {float} alpha   (optional) Transparency value, between 0.0 (fully transparent) and 1.0 (fully opaque).
     */
    toString: function(alpha) {
        var a = (alpha) ? alpha : ((this.a) ? this.a : 1.0);
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + a + ')';
    },

    /**
     * Returns the hexadecimal representation of this color (without the alpha channel as hex colors don't support it)
     */
    toHexString: function() {
    	return "#" + this._toHex(this.r) + this._toHex(this.g) + this._toHex(this.b); 
    },
    
    /*
     * Parses and stores the hex values of the input color string.
     * 
     * @param {String} color    Hex or rgb() css string.
     */
    _fromHex: function(color) {
        if(/^#?([\da-f]{3}|[\da-f]{6})$/i.test(color)){
            color = color.replace(/^#/, '').replace(/^([\da-f])([\da-f])([\da-f])$/i, "$1$1$2$2$3$3");
            this.r = parseInt(color.substr(0,2), 16);
            this.g = parseInt(color.substr(2,2), 16);
            this.b = parseInt(color.substr(4,2), 16);
        } else if(/^rgb *\( *\d{0,3} *, *\d{0,3} *, *\d{0,3} *\)$/i.test(color)){
            color = color.match(/^rgb *\( *(\d{0,3}) *, *(\d{0,3}) *, *(\d{0,3}) *\)$/i);
            this.r = parseInt(color[1], 10);
            this.g = parseInt(color[2], 10);
            this.b = parseInt(color[3], 10);
        }
        this.a = 1.0;
        return this.check();
    },
    
    /*
     * Returns an hexadecimal representation of a 8 bit integer 
     */
    _toHex: function(dec) {
        var hex = "0123456789ABCDEF"
        if (dec < 0) return "00";
        if (dec > 255) return "FF";
        var i = Math.floor(dec / 16);
        var j = dec % 16;
        return hex.charAt(i) + hex.charAt(j);
    }

};

//MATH.JS
/**
 * Math Utility functions
 * 
 * @fileOverview Math Utility functions
 * @name Math
 */

Timeplot.Math = { 

    /**
     * Evaluates the range (min and max values) of the given array
     */
    range: function(f) {
        var F = f.length;
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;

        for (var t = 0; t < F; t++) {
            var value = f[t];
            if (value < min) {
                min = value;
            }
            if (value > max) {
                max = value;
            }    
        }

        return {
            min: min,
            max: max
        }
    },

    /**
     * Evaluates the windows average of a given array based on the
     * given window size
     */
    movingAverage: function(f, size) {
        var F = f.length;
        var g = new Array(F);
        for (var n = 0; n < F; n++) {
            var value = 0;
            for (var m = n - size; m < n + size; m++) {
                if (m < 0) {
                    var v = f[0];
                } else if (m >= F) {
                    var v = g[n-1];
                } else {
                    var v = f[m];
                }
                value += v;
            }
            g[n] = value / (2 * size);
        }
        return g;
    },

    /**
     * Returns an array with the integral of the given array
     */
    integral: function(f) {
        var F = f.length;

        var g = new Array(F);
        var sum = 0;

        for (var t = 0; t < F; t++) {
           sum += f[t];
           g[t] = sum;  
        }

        return g;
    },

    /**
     * Normalizes an array so that its complete integral is 1.
     * This is useful to obtain arrays that preserve the overall
     * integral of a convolution. 
     */
    normalize: function(f) {
        var F = f.length;
        var sum = 0.0;

        for (var t = 0; t < F; t++) {
            sum += f[t];
        }

        for (var t = 0; t < F; t++) {
            f[t] /= sum;
        }

        return f;
    },

    /**
     * Calculates the convolution between two arrays
     */
    convolution: function(f,g) {
        var F = f.length;
        var G = g.length;

        var c = new Array(F);

        for (var m = 0; m < F; m++) {
            var r = 0;
            var end = (m + G < F) ? m + G : F;
            for (var n = m; n < end; n++) {
                var a = f[n - G];
                var b = g[n - m];
                r += a * b;
            }
            c[m] = r;
        }

        return c;
    },

    // ------ Array generators ------------------------------------------------- 
    // Functions that generate arrays based on mathematical functions
    // Normally these are used to produce operators by convolving them with the input array
    // The returned arrays have the property of having 

    /**
     * Generate the heavyside step function of given size
     */
    heavyside: function(size) {
        var f =  new Array(size);
        var value = 1 / size;
        for (var t = 0; t < size; t++) {
            f[t] = value;
        }
        return f;
    },

    /**
     * Generate the gaussian function so that at the given 'size' it has value 'threshold'
     * and make sure its integral is one.
     */
    gaussian: function(size, threshold) {
        with (Math) {
            var radius = size / 2;
            var variance = radius * radius / log(threshold); 
            var g = new Array(size);
            for (var t = 0; t < size; t++) {
                var l = t - radius;
                g[t] = exp(-variance * l * l);
            }
        }

        return this.normalize(g);
    },

    // ---- Utility Methods --------------------------------------------------

    /**
     * Return x with n significant figures 
     */
    round: function(x,n) {
        with (Math) {
            if (abs(x) > 1) {
                var l = floor(log(x)/log(10));
                var d = round(exp((l-n+1)*log(10)));
                var y = round(round(x / d) * d);
                return y;
            } else {
                log("FIXME(SM): still to implement for 0 < abs(x) < 1");
                return x;
            }
        }
    },
    
    /**
     * Return the hyperbolic tangent of x
     */
    tanh: function(x) {
        if (x > 5) {
            return 1;
        } else if (x < 5) {
            return -1;
        } else {
            var expx2 = Math.exp(2 * x);
            return (expx2 - 1) / (expx2 + 1);
        }
    },
    
    /** 
     * Returns true if |a.x - b.x| < value && | a.y - b.y | < value
     */
    isClose: function(a,b,value) {
        return (a && b && Math.abs(a.x - b.x) < value && Math.abs(a.y - b.y) < value);
    }

}

//PROCESSOR.JS
/**
 * Processing Data Source
 * 
 * @fileOverview Processing Data Source and Operators
 * @name Processor
 */

/* -----------------------------------------------------------------------------
 * Operators
 * 
 * These are functions that can be used directly as Timeplot.Processor operators
 * ----------------------------------------------------------------------------- */

Timeplot.Operator = { 

    /**
     * This is the operator used when you want to draw the cumulative sum
     * of a time series and not, for example, their daily values.
     */
    sum: function(data, params) {
        return Timeplot.Math.integral(data.values);
    },

    /**
     * This is the operator that is used to 'smooth' a given time series
     * by taking the average value of a moving window centered around
     * each value. The size of the moving window is influenced by the 'size'
     * parameters in the params map.
     */
    average: function(data, params) {
        var size = ("size" in params) ? params.size : 30;
        var result = Timeplot.Math.movingAverage(data.values, size);
        return result;
    }
}

/*==================================================
 *  Processing Data Source
 *==================================================*/

/**
 * A Processor is a special DataSource that can apply an Operator
 * to the DataSource values and thus return a different one.
 * 
 * @constructor
 */
Timeplot.Processor = function(dataSource, operator, params) {
    this._dataSource = dataSource;
    this._operator = operator;
    this._params = params;

    this._data = {
        times: new Array(),
        values: new Array()
    };

    this._range = {
        earliestDate: null,
        latestDate: null,
        min: 0,
        max: 0
    };

    var processor = this;
    this._processingListener = {
        onAddMany: function() { processor._process(); },
        onClear:   function() { processor._clear(); }
    }
    this.addListener(this._processingListener);
};

Timeplot.Processor.prototype = {

    _clear: function() {
        this.removeListener(this._processingListener);
        this._dataSource._clear();
    },

    _process: function() {
        // this method requires the dataSource._process() method to be
        // called first as to setup the data and range used below
        // this should be guaranteed by the order of the listener registration  

        var data = this._dataSource.getData();
        var range = this._dataSource.getRange();

        var newValues = this._operator(data, this._params);
        var newValueRange = Timeplot.Math.range(newValues);

        this._data = {
            times: data.times,
            values: newValues
        };

        this._range = {
            earliestDate: range.earliestDate,
            latestDate: range.latestDate,
            min: newValueRange.min,
            max: newValueRange.max
        };
    },

    getRange: function() {
        return this._range;
    },

    getData: function() {
        return this._data;
    },
    
    getValue: Timeplot.DataSource.prototype.getValue,

    addListener: function(listener) {
        this._dataSource.addListener(listener);
    },

    removeListener: function(listener) {
        this._dataSource.removeListener(listener);
    }
}

/*HYPERIC CHANGES FOR TIMEPLOT BUNDLE*/

// Functions added to support formatting of dates
String.repeat = function(chr,count)
{    
    var str = ""; 
    for(var x=0;x<count;x++) {str += chr}; 
    return str;
}

String.prototype.padL = function(width,pad)
{
    if (!width ||width<1)
        return this;   
 
    if (!pad) pad=" ";        
    var length = width - this.length
    if (length < 1) return this.substr(0,width);
 
    return (String.repeat(pad,length) + this).substr(0,width);    
}    

String.prototype.padR = function(width,pad)
{
    if (!width || width<1)
        return this;        
 
    if (!pad) pad=" ";
    var length = width - this.length
    if (length < 1) this.substr(0,width);
 
    return (this + String.repeat(pad,length)).substr(0,width);
} 

Date.prototype.formatDate = function(format)
{
    var date = this;
    if (!format)
      format="MM/dd/yyyy";               
 
    var month = date.getMonth() + 1;
    var year = date.getFullYear();    
 
    format = format.replace("MM",month.toString().padL(2,"0"));        
 
    if (format.indexOf("yyyy") > -1)
        format = format.replace("yyyy",year.toString());
    else if (format.indexOf("yy") > -1)
        format = format.replace("yy",year.toString().substr(2,2));
 
    format = format.replace("dd",date.getDate().toString().padL(2,"0"));
 
    var hours = date.getHours();       
    if (format.indexOf("t") > -1)
    {
       if (hours > 11)
        format = format.replace("t","pm")
       else
        format = format.replace("t","am")
    }
    if (format.indexOf("HH") > -1)
        format = format.replace("HH",hours.toString().padL(2,"0"));
    if (format.indexOf("hh") > -1) {
        if (hours > 12) hours -= 12;
        if (hours == 0) hours = 12;
        format = format.replace("hh",hours.toString().padL(2,"0"));        
    }
    if (format.indexOf("mm") > -1)
       format = format.replace("mm",date.getMinutes().toString().padL(2,"0"));
    if (format.indexOf("ss") > -1)
       format = format.replace("ss",date.getSeconds().toString().padL(2,"0"));
    return format;
}