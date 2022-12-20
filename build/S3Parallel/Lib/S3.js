"use strict"
let Caf = require('caffeine-script-runtime');
Caf.defMod(module, () => {return Caf.importInvoke(["BaseClass", "shellEscape", "lowerCamelCase", "currentSecond", "log", "Array", "Error", "merge", "encodeURIComponent", "path", "timeout", "createWriteStreamSafe", "Promise", "compactFlatten", "createS3Url", "shellExec", "dashCase", "isFunction", "present"], [global, require('../StandardImport'), require('./FsEasy'), require('./LibMisc'), {shellEscape: require('shell-escape'), promisify: require('util').promisify, fs: require('fs'), path: require('path')}], (BaseClass, shellEscape, lowerCamelCase, currentSecond, log, Array, Error, merge, encodeURIComponent, path, timeout, createWriteStreamSafe, Promise, compactFlatten, createS3Url, shellExec, dashCase, isFunction, present) => {let escape, S3; escape = function(single) {return shellEscape([single]);}; require('aws-sdk').config.setPromisesDependency(require('bluebird')); return S3 = Caf.defClass(class S3 extends BaseClass {}, function(S3, classSuper, instanceSuper) {this.awsSdkS3 = new (require('aws-sdk').S3)({}); this.classGetter({s3: function() {return this.awsSdkS3;}}); this.commonCopyOptionsSdkKeys = ["ACL", "CacheControl", "ContentDisposition", "ContentEncoding", "ContentLanguage", "ContentType", "Expires", "RequestPayer", "StorageClass"]; this.commonSdkCopyOptionsByLowerCamelCaseKeys = Caf.object(this.commonCopyOptionsSdkKeys, null, null, null, (k) => lowerCamelCase(k)); this.listBuckets = () => this.s3.listBuckets().promise().then(({Buckets}) => Caf.object(Buckets, ({Name, CreationDate}) => CreationDate, null, null, ({Name, CreationDate}) => Name)); this.list = ({bucket, prefix, limit = 1000, fetchOwner, startAfter}) => {let startTime; startTime = currentSecond(); return this.s3.listObjectsV2({Bucket: bucket, Prefix: prefix, MaxKeys: limit, StartAfter: startAfter, FetchOwner: fetchOwner}).promise().tapCatch((error) => log.error({"S3.list-error": {bucket, prefix, startAfter, limit, error}})).then((results) => {let duration; duration = currentSecond() - startTime; if (!(Caf.is(results.Contents, Array))) {log.warn({"S3.list-no-Contents": {bucket, prefix, startAfter, limit, duration, results}}); throw new Error("S3.list: Contents is not an array");} else {if (duration > 60) {log.warn({"S3.list-slow": {bucket, prefix, startAfter, limit, duration, results: merge(results, {Contents: `Array ${Caf.toString(results.Contents.length)}`})}});};}; return results.Contents;});}; this.copy = (options) => {let largeCopyThreshold, scratchState, copyScratchState, fromBucket, toBucket, fromKey, toKey, size, toFolder, pretend, verbose, copyOptions, toLocalFile, temp, temp1; if ((largeCopyThreshold = options.largeCopyThreshold, scratchState = options.scratchState)) {copyScratchState = ((temp = scratchState.copyScratchState) != null ? temp : scratchState.copyScratchState = {});}; temp1 = this._normalizeCopyOptions(options); fromBucket = temp1.fromBucket; toBucket = temp1.toBucket; fromKey = temp1.fromKey; toKey = temp1.toKey; size = temp1.size; toFolder = temp1.toFolder; pretend = temp1.pretend; verbose = temp1.verbose; return (size >= largeCopyThreshold || /\s/.test(toKey)) ? this.largeCopy({commonCopyOptions: this.extractCommonCopyOptions(options), fromBucket, toBucket, toFolder, fromKey, toKey, pretend, verbose}) : (copyOptions = merge(toFolder ? {Bucket: fromBucket, Key: fromKey} : {CopySource: encodeURIComponent(`${Caf.toString(fromBucket)}/${Caf.toString(fromKey)}`), Bucket: toBucket, Key: toKey}, this._getCommonCopyOptionsForSdk(options)), toLocalFile = toFolder ? path.join(toFolder, toKey) : undefined, verbose ? log.unquoted(merge({copyObject: copyOptions, toLocalFile})) : undefined, pretend ? timeout(1, () => {return {pretend: true};}) : toFolder ? createWriteStreamSafe(toLocalFile, copyScratchState).then((writeStream) => new Promise((resolve, reject) => this.s3.getObject(copyOptions).createReadStream().pipe(writeStream).on("finish", resolve).on("error", reject))) : this.s3.copyObject(copyOptions).promise());}; this.delete = (options) => this.s3.deleteObject({Bucket: options.bucket, Key: options.key}); this.largeCopy = (options) => {let commonCopyOptions, fromBucket, fromFolder, toBucket, toFolder, fromKey, toKey, pretend, verbose, command, temp; commonCopyOptions = options.commonCopyOptions; temp = this._normalizeCopyOptions(options); fromBucket = temp.fromBucket; fromFolder = temp.fromFolder; toBucket = temp.toBucket; toFolder = temp.toFolder; fromKey = temp.fromKey; toKey = temp.toKey; pretend = temp.pretend; verbose = temp.verbose; command = compactFlatten([`aws s3 cp ${Caf.toString(escape(createS3Url(fromBucket, fromFolder, fromKey)))} ${Caf.toString(escape(createS3Url(toBucket, toFolder, toKey)))}`, Caf.array(commonCopyOptions, (v, key) => `--${Caf.toString(dashCase(key))} ${Caf.toString((() => {switch (v) {case true: return ""; default: return escape(v);};})())}`, (v, key) => v)]).join(" "); if (verbose) {log.unquoted({largeCopy: command});}; return pretend ? timeout(1, () => {return {pretend: true};}) : shellExec(command);}; this.headObject = ({bucket, key}) => this.s3.headObject({Bucket: bucket, Key: key}).promise(); this._normalizeCopyOptions = function(options) {let bucket, key, fromBucket, toBucket, fromKey, toKey, size, temp, temp1, temp2, temp3; bucket = options.bucket; key = options.key; fromBucket = (undefined !== (temp = options.fromBucket)) ? temp : bucket; toBucket = (undefined !== (temp1 = options.toBucket)) ? temp1 : bucket; fromKey = (undefined !== (temp2 = options.fromKey)) ? temp2 : key; toKey = (undefined !== (temp3 = options.toKey)) ? temp3 : key; size = options.size; if (isFunction(toKey)) {toKey = toKey(fromKey, fromBucket, toBucket, options.size);}; if (!(present(fromBucket) && present(toBucket) && present(fromKey) && present(toKey))) {throw new Error("Missing one of: fromBucket, toBucket, fromKey, toKey or bucket or key as a default");}; return merge(options, {fromBucket, fromKey, toBucket, toKey});}; this._getCommonCopyOptionsForSdk = (options) => Caf.object(this.commonSdkCopyOptionsByLowerCamelCaseKeys, (sdkKey, lowerCamelCasedKey) => options[lowerCamelCasedKey], null, null, (sdkKey, lowerCamelCasedKey) => sdkKey); this.extractCommonCopyOptions = (options) => Caf.object(this.commonSdkCopyOptionsByLowerCamelCaseKeys, (v, k) => options[k]); this.shouldSyncObjects = function(options) {let fromBucket, toBucket, fromKey, toKey, temp; temp = this._normalizeCopyOptions(options); fromBucket = temp.fromBucket; toBucket = temp.toBucket; fromKey = temp.fromKey; toKey = temp.toKey; return Promise.then(() => (options.size < Caf.pow(1024, 2) || !options.size) ? true : this.headObject(options).then(({ContentLength}) => ContentLength !== options.size));}; this.syncObject = (options) => this.shouldSyncObjects(options).then((shouldSync) => shouldSync ? this.copyObject(options).then((result) => merge(result, {copied: true})) : {copied: false});});});});
//# sourceMappingURL=S3.js.map
