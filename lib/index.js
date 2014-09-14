'use strict';

var _          = require('lodash');
var each       = require('async').each;
var contentful = require('contentful');
var debug      = require('debug')('contentful-metalsmith');
var moment     = require('moment');

/**
 * Expose the plugin
 */
module.exports = plugin;

function plugin(options){
  var options = options,
    requireProperty = function(object, property) {
      if (!object.hasOwnProperty(property)) {
        throw new TypeError('Expected property ' + property);
      }
    }

  requireProperty(options, 'accessToken');

  return function(files, metalsmith, done){
    var keys = Object.keys(files),
      files = files,
      done = done;

    // Client for interacting with the contentful API.
    var ContentfulClient = function(options) {
      return contentful.createClient({
        space : options.spaceId,
        accessToken : options.accessToken
      });
    }

    // Constructs a query for fetching entries.
    var ContentfulQuery = function(contentfulFileData) {
      this.contentfulFileData = contentfulFileData;
      return _.extend({},
        this.content_type(),
        this.filter()
      )
    }

    ContentfulQuery.prototype.content_type = function() {
      if (typeof this.contentfulFileData.content_type !== "undefined" && 
        this.contentfulFileData.content_type !== null) {
        return { content_type: this.contentfulFileData.content_type };
      } else {
        return undefined;
      }
    }

    ContentfulQuery.prototype.filter = function() {
      return this.contentfulFileData.filter;
    }

    // A file from Metalsmith's source directory.
    var SourceFile = function(file, done){
      this.fileMetadata = files[file];
      this.contentTypes = {};
      //this.entries = [];
      this.done = done;
      this.verifyContentful();
      requireProperty(this.fileMetadata.contentful, 'space_id');
      
      this.client = new ContentfulClient({
        accessToken: options.accessToken,
        spaceId: this.fileMetadata.contentful.space_id
      });

      this.client.entries(new ContentfulQuery(this.fileMetadata.contentful)).then(this.onSuccess.bind(this), this.onError.bind(this));
    }

    SourceFile.prototype.verifyContentful = function() {
      if (!this.fileMetadata.contentful) {
        this.done();
        return;
      }
    }

    SourceFile.prototype.onSuccess = function(data) {
      each(data, function(_this) {
        var processor = new EntryProcessor(_this.fileMetadata.contentful);
        return processor.process.bind(processor);
      }(this), this.done);
    }

    SourceFile.prototype.onError = function(err) {
      debug('An unexpected error happened while trying to fetch the entries (' + err.message +')');
      this.done();
    }


    function ensureContentType(contentTypes, contentType){
      contentTypes[contentType] = contentTypes[contentType] || [];
      return contentTypes;
    }

    function pushEntryToContentType(contentTypes, contentType, entry){
      contentTypes[contentType].push(entry);
    }

    // EntryProccessor 
    var EntryProcessor = function(contentfulData) {
      //this.entries = contentfulData.entries;
      this.template = contentfulData.entry_template;
      this.contentTypes = contentfulData.contentTypes;
      this.file = {};
    }

    EntryProcessor.prototype.fileName = function(entry) {
      var extension;

      if (this.template) {
        extension = this.template.split('.').slice(1).pop();
      }
      extension = extension || 'html';

      return entry.contentType() + '-' + entry.contentfulId () + '.' + extension;
    }

    EntryProcessor.prototype.process = function(entry, done) {
      var processedEntry = new Entry(entry),
        file = processedEntry.toFile();

      file.template = this.template;
      files[this.fileName(processedEntry)] = file;

      // This check is being performed for each entry, it might be done out of this loop
      //ensureContentType(options.contentTypes, contentType);
      //pushEntryToContentType(options.contentTypes, contentType, file);
      //options.entries.push(file);

      debug('Processed file ' + file);
      done();
    };

    // Entry maps an entry from contentful to a file wanted by metalsmith.
    var Entry = function(entry) {
      this.entry = entry;
    }

    Entry.prototype.contentfulId = function() {
      return this.entry.sys.id;
    }

    Entry.prototype.contents = function() {
      return new Buffer(this.entry.fields.body);
    }

    Entry.prototype.contentType = function() {
      return this.entry.sys.contentType.sys.id;
    }

    Entry.prototype.subject = function() {
      return this.entry.fields.subject;
    }

    Entry.prototype.date = function() {
      return moment(this.entry.sys.createdAt).format("MM-DD-YYYY");
    }

    Entry.prototype.category = function() {
      return this.entry.fields.category.fields.title;
    }

    Entry.prototype.toFile = function() {
      return {
        contents    : this.contents(),
        data        : this.entry,
        id          : this.contentfulId,
        contentType : this.contentType,
        template    : this.template,
        title       : this.subject(),
        date        : this.date(),
        collection  : this.category()
      };
    }

    each(keys, function(file, done) {
      new SourceFile(file, done);
    }, done);
  }
}



