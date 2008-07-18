var Douban; if (Douban == null) Douban = {};
if (Douban.Request == null) Douban.Request = {};

Douban.OAuth =  new Class({
	Implements: [Events, Options],
	options: {
		apikey: "",
		secret: "",
    signatureMethod: "PLAINTEXT",
		requestTokenURL: "http://www.douban.com/service/auth/request_token",
		userAuthorizationURL: "http://www.douban.com/service/auth/authorize",
		accessTokenURL: "http://www.douban.com/service/auth/access_token",
		requestToken: null,
		requestTokenSecret: null,
		accessToken: null,
		accessTokenSecret: null,
		userId: null
  },
	initialize: function(options){
		this.setOptions(options);
	},
	getRequestToken: function(){
		var message = {
			method: "POST", 
			action: this.options.requestTokenURL, 
			parameters: {
				oauth_consumer_key: this.options.apikey,
				oauth_signature_method: this.options.signatureMethod,
				oauth_signature: "",
				oauth_timestamp: "",
				oauth_nonce: ""
			}
		}
		OAuth.setTimestampAndNonce(message);
  	OAuth.SignatureMethod.sign(message, {consumerSecret: this.options.secret});
  	
  	var req = new Request(
  		{
  			url: message.action,
  			method: message.method,
  			data: OAuth.getParameterMap(message.parameters),
  			headers: {'content-type': 'application/x-www-form-urlencoded'},
  			onSuccess: (function(responseText){
	    		var responseObj = OAuth.getParameterMap(OAuth.decodeForm(responseText));
	    		this.options.requestToken = responseObj.oauth_token
	    		this.options.requestTokenSecret = responseObj.oauth_token_secret
	    		this.fireEvent('requestToken', responseObj)
	    	}).bind(this),
	    	onFailure: (function(){this.fireEvent('requestTokenFailure')}).bind(this)
  		}
  	).send()
	},
	getUserAuthorizationURL: function(cb){
		if (!$defined(this.options.requestToken)) return null;
		var args = {oauth_token: this.options.requestToken}
		if ($defined(cb)) args.oauth_callback = cb
		return this.options.userAuthorizationURL + '?' + (new Hash(args).toQueryString());
	},
	getAccessToken: function(){
		if (!$defined(this.options.requestToken)) return null;	
		var message = {
			method: "POST", 
			action: this.options.accessTokenURL, 
			parameters: {
				oauth_consumer_key: this.options.apikey,
				oauth_token: this.options.requestToken,
				oauth_signature_method: this.options.signatureMethod,
				oauth_signature: "",
				oauth_timestamp: "",
				oauth_nonce: ""
			}
		}
		OAuth.setTimestampAndNonce(message);
  	OAuth.SignatureMethod.sign(message, {
  		consumerSecret: this.options.secret,
  		tokenSecret: this.options.requestTokenSecret,
  	});
  	
  	var req = new Request(
  		{
  			url: message.action,
  			method: message.method,
  			data: OAuth.getParameterMap(message.parameters),
  			headers: {'content-type': 'application/x-www-form-urlencoded'},
  			onSuccess: (function(responseText){
	    		var responseObj = OAuth.getParameterMap(OAuth.decodeForm(responseText));
	    		this.options.accessToken = responseObj.oauth_token
	    		this.options.accessTokenSecret = responseObj.oauth_token_secret
	    		this.options.userId = responseObj.douban_user_id
	    		this.fireEvent('accessToken', responseObj)
	    	}).bind(this),
	    	onFailure: (function(){this.fireEvent('accessTokenFailure')}).bind(this)
  		}
  	).send()
	},
	getAccessTokenFromEncryptedLocalStore: function(){
		var accessToken = air.EncryptedLocalStore.getItem("accessToken")
		var accessTokenSecret = air.EncryptedLocalStore.getItem("accessTokenSecret")
		var userId = air.EncryptedLocalStore.getItem("userId")
		
		if ($defined(accessToken) &&
			$defined(accessTokenSecret) &&
			$defined(userId)) {
			this.options.accessToken = accessToken.readUTFBytes(accessToken.length)
	    this.options.accessTokenSecret = accessTokenSecret.readUTFBytes(accessTokenSecret.length)
	    this.options.userId = userId.readUTFBytes(userId.length)
		} else {
			air.EncryptedLocalStore.reset();
		}
	},
	isAuthenticated: function(){
		with(this.options) {
			return ($defined(accessToken) &&
				$defined(accessTokenSecret) &&
				$defined(userId))
		}
	},
	revoke: function(){
		air.EncryptedLocalStore.reset();
		with(this.options) {
			requestToken = null
			requestTokenSecret = null
			accessToken = null
			accessTokenSecret = null
			userId = null
		}
	}
});

Douban.Request.User = new Class({
	Extends: Request.JSON,
	options: {
		userId: null,
		method: 'get',
		url: 'http://api.douban.com/people/{userId}?alt=json',
		url_template: 'http://api.douban.com/people/{userId}?alt=json'
	},
	initialize: function(options){
		this.parent(options);
		this.headers.extend({'Accept': 'application/json', 'X-Request': 'JSON'});
	},
	success: function(text){
		this.response.json = JSON.decode(text, this.options.secure);
		this.response.user = DOUBAN.parseUser(this.response.json);
		this.onSuccess(this.response.user);
	},
	send: function(options) {
		this.setOptions(options)
		if ($defined(this.options.userId)) {
			this.options.url = this.options.url_template.substitute(this.options)
			this.parent();
		}
	}
});

Douban.Request.UserCollection = new Class({
	Extends: Request.JSON,
	options: {
		userId: null,
		cat: null,
		status: null,
		startindex: 1,
		maxresults: 50,
		method: 'get',
		url: 'http://api.douban.com/people/{userId}/collection?cat={cat}&status={status}&start-index={startindex}&max-results={maxresults}&alt=json',
		url_template: 'http://api.douban.com/people/{userId}/collection?cat={cat}&status={status}&start-index={startindex}&max-results={maxresults}&alt=json'
	},
	initialize: function(options){
		this.parent(options);
		this.headers.extend({'Accept': 'application/json', 'X-Request': 'JSON'});
	},
	success: function(text){
		this.response.json = JSON.decode(text, this.options.secure);
		this.response.collection = DOUBAN.parseMultiCollection(this.response.json);
		this.onSuccess(this.response.collection);
	},
	send: function(options) {
		this.setOptions(options)
		if ($defined(this.options.userId) &&
			$defined(this.options.cat) &&
			$defined(this.options.status) &&
			$defined(this.options.startindex) &&
			$defined(this.options.maxresults)) {
			this.options.url = this.options.url_template.substitute(this.options)
			this.fireEvent('request', this);
			this.parent();
		}
	}
});