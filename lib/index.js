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
  var client;
  enforcep(options, 'accessToken');

  return function(files, metalsmith, done){
    var keys = Object.keys(files);
    each(keys, SourceFile, done);

    // Client for interacting with the contentful API.
    function ContentfulClient(options) {
      this.client = contentful.createClient({
        space : options.spaceId,
        accessToken : options.accessToken
      });
    }

    // Constructs a query for fetching entries.
    function ContentfulQuery(contentfulFileData) {
      this.fileMetadata = fileMetadata;
      return _.extend({},
        this.content_type,
        this.filter
      )
    }

    ContentfulQuery.prototype.content_type = function() {
      return if (typeof this.contentfulFileData.content_type !== "undefined" && 
        this.contentfulFileData.content_type !== null) {
        { content_type: this.contentfulFileData.content_type }
      } else {
        undefined
      }
    }

    ContentfulQuery.prototype.filter = function() {
      return this.fileMetadata.contentful.filter;
    }

    // A file from Metalsmith's source directory.
    function SourceFile(file, done){
      this.fileMetadata = files[file];
      this.contentTypes = {};
      this.entries = [];
      this.done = done;
      this.verifyContentful();
      enforcep(this.fileMetadata.contentful, 'space_id');
      
      this.client = ContentfulClient({
        accessToken: options.accessToken,
        spaceId: fileMetadata.contentful.space_id
      });

      client.entries(ContentfulQuery(fileMetadata.contentful).then(onSuccessfulEntriesFetch(fileMetadata.contentful, fileProcessedCallback), onErroneousEntriesFetch(fileProcessedCallback));

      debug('Processed file ' + file );
    }

    SourceFile.prototype.verifyContentful = function() {
      if (!this.fileMetadata.contentful) {
        this.done();
        return;
      }
    }

    function fetchEntries(query, fileMetadata, fileProcessedCalback) {
      
    }

    function onSuccessfulEntriesFetch(options, done) {
      return function(data){
        each(data,
          entryProcessor({
            entries      : options.entries,
            template     : options.entry_template,
            contentTypes : options.contentTypes
          }),
          done);
      };
    }

    function onErroneousEntriesFetch(done) {
      return function(err) {
        debug('An unexpected error happened while trying to fetch the entries (' + err.message +')');
        done();
      };
    }


    function ensureContentType(contentTypes, contentType){
      contentTypes[contentType] = contentTypes[contentType] || [];
      return contentTypes;
    }

    function pushEntryToContentType(contentTypes, contentType, entry){
      contentTypes[contentType].push(entry);
    }

    //function getDisplayField(contentType) {
    //  return client.getContentType(contentType).
    //}

    function entryProcessor(options) {
      return function (entry, entryProcessedCallback){
        var file,
          contentType = options.contentType ? contentType : entry.sys.contentType.sys.id;

        /*
         * Create a "virtual" (virtual because it doesn't exist in the src/ dir)
         * file that will be processed by metalsmith
         */
        file = {
          contents    : new Buffer(entry.fields.body),
          data        : entry,
          id          : entry.sys.id,
          contentType : contentType,
          template    : options.template,
          title       : entry.fields.subject,
          date        : moment(entry.sys.createdAt).format("MM-DD-YYYY"),
          collection  : entry.fields.category.fields.title
        };

        /*
         * Give a name to the file that will be created on
         * the build dir
         */
        if (options.template){
          var extension = options.template.split('.').slice(1).pop() || 'html';
          files[contentType + '-' + file.id + '.' + extension] = file;
        }

        // This check is being performed for each entry, it might be done out of this loop
        ensureContentType(options.contentTypes, contentType);
        pushEntryToContentType(options.contentTypes, contentType, file);
        options.entries.push(file);

        entryProcessedCallback();
      };
    }

    function createContentfulClient(accessToken, spaceId){
      return contentful.createClient({
        space : spaceId,
        accessToken : accessToken
      });
    }
  };

  function exists(value){
    return value != null;
  }

  function enforcep(object, property) {
    if (!exists(object[property]))
      throw new TypeError('Expected property ' + property);
  }
}

