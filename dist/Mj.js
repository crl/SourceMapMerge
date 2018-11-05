var lingyu;
(function (lingyu) {
    class FileUtil {
        constructor() {
            this.FS = require("fs");
            this.Path = require("path");
            this.charset = "utf-8";
            this.textTemp = {};
        }
        /**
         * 保存数据到指定文件
         * @param path 文件完整路径名
         * @param data 要保存的数据
         */
        save(path, data) {
            if (this.exists(path)) {
                this.remove(path);
            }
            path = this.escapePath(path);
            this.textTemp[path] = data;
            this.createDirectory(this.Path.dirname(path));
            this.FS.writeFileSync(path, data, { encoding: this.charset });
        }
        /**
         * 创建文件夹
         */
        createDirectory(path, mode) {
            path = this.escapePath(path);
            if (mode === undefined) {
                mode = 511 & (~process.umask());
            }
            if (typeof mode === 'string')
                mode = parseInt(mode, 8);
            path = this.Path.resolve(path);
            try {
                this.FS.mkdirSync(path, mode);
            }
            catch (err0) {
                switch (err0.code) {
                    case 'ENOENT':
                        this.createDirectory(this.Path.dirname(path), mode);
                        this.createDirectory(path, mode);
                        break;
                    default:
                        var stat;
                        try {
                            stat = this.FS.statSync(path);
                        }
                        catch (err1) {
                            throw err0;
                        }
                        if (!stat.isDirectory())
                            throw err0;
                        break;
                }
            }
        }
        /**
         * 读取文本文件,返回打开文本的字符串内容，若失败，返回"".
         * @param path 要打开的文件路径
         */
        read(path, ignoreCache = false) {
            path = this.escapePath(path);
            var text = this.textTemp[path];
            if (text && !ignoreCache) {
                return text;
            }
            try {
                text = this.FS.readFileSync(path, this.charset);
                text = text.replace(/^\uFEFF/, '');
            }
            catch (err0) {
                return "";
            }
            if (text) {
                var ext = this.getExtension(path).toLowerCase();
                if (ext == "ts" || ext == "exml") {
                    this.textTemp[path] = text;
                }
            }
            return text;
        }
        /**
         * 读取字节流文件,返回字节流，若失败，返回null.
         * @param path 要打开的文件路径
         */
        readBinary(path) {
            path = this.escapePath(path);
            try {
                var binary = this.FS.readFileSync(path);
            }
            catch (e) {
                return null;
            }
            return binary;
        }
        /**
         * 复制文件或目录
         * @param source 文件源路径
         * @param dest 文件要复制到的目标路径
         */
        copy(source, dest) {
            source = this.escapePath(source);
            dest = this.escapePath(dest);
            var stat = this.FS.lstatSync(source);
            if (stat.isDirectory()) {
                this._copy_dir(source, dest);
            }
            else {
                this._copy_file(source, dest);
            }
        }
        isDirectory(path) {
            path = this.escapePath(path);
            try {
                var stat = this.FS.statSync(path);
            }
            catch (e) {
                return false;
            }
            return stat.isDirectory();
        }
        isSymbolicLink(path) {
            path = this.escapePath(path);
            try {
                var stat = this.FS.statSync(path);
            }
            catch (e) {
                return false;
            }
            return stat.isSymbolicLink();
        }
        isFile(path) {
            path = this.escapePath(path);
            try {
                var stat = this.FS.statSync(path);
            }
            catch (e) {
                return false;
            }
            return stat.isFile();
        }
        _copy_file(source_file, output_file) {
            this.createDirectory(this.Path.dirname(output_file));
            var byteArray = this.FS.readFileSync(source_file);
            this.FS.writeFileSync(output_file, byteArray);
        }
        _copy_dir(sourceDir, outputDir) {
            this.createDirectory(outputDir);
            var list = this.readdirSync(sourceDir);
            let _ = this;
            list.forEach((fileName) => {
                _.copy(_.Path.join(sourceDir, fileName), _.Path.join(outputDir, fileName));
            });
        }
        /**
         * 删除文件或目录
         * @param path 要删除的文件源路径
         */
        remove(path) {
            path = this.escapePath(path);
            try {
                this.FS.lstatSync(path).isDirectory()
                    ? this.rmdir(path)
                    : this.FS.unlinkSync(path);
                this.getDirectoryListing(path);
            }
            catch (e) {
            }
        }
        rmdir(path) {
            var files = [];
            if (this.FS.existsSync(path)) {
                let _ = this;
                files = this.readdirSync(path);
                files.forEach((file) => {
                    var curPath = path + "/" + file;
                    if (_.FS.statSync(curPath).isDirectory()) {
                        _.rmdir(curPath);
                    }
                    else {
                        _.FS.unlinkSync(curPath);
                    }
                });
                this.FS.rmdirSync(path);
            }
        }
        rename(oldPath, newPath) {
            if (this.isDirectory(oldPath)) {
                this.FS.renameSync(oldPath, newPath);
            }
        }
        /**
         * 返回指定文件的父级文件夹路径,返回字符串的结尾已包含分隔符。
         */
        getDirectory(path) {
            path = this.escapePath(path);
            return this.Path.dirname(path) + "/";
        }
        /**
         * 获得路径的扩展名,不包含点字符。
         */
        getExtension(path) {
            path = this.escapePath(path);
            var index = path.lastIndexOf(".");
            if (index == -1)
                return "";
            var i = path.lastIndexOf("/");
            if (i > index)
                return "";
            return path.substring(index + 1);
        }
        /**
         * 获取路径的文件名(不含扩展名)或文件夹名
         */
        getFileName(path) {
            if (!path)
                return "";
            path = this.escapePath(path);
            var startIndex = path.lastIndexOf("/");
            var endIndex;
            if (startIndex > 0 && startIndex == path.length - 1) {
                path = path.substring(0, path.length - 1);
                startIndex = path.lastIndexOf("/");
                endIndex = path.length;
                return path.substring(startIndex + 1, endIndex);
            }
            endIndex = path.lastIndexOf(".");
            if (endIndex == -1 || this.isDirectory(path))
                endIndex = path.length;
            return path.substring(startIndex + 1, endIndex);
        }
        /**
         * 获取指定文件夹下的文件或文件夹列表，不包含子文件夹内的文件。
         * @param path 要搜索的文件夹
         * @param relative 是否返回相对路径，若不传入或传入false，都返回绝对路径。
         */
        getDirectoryListing(path, relative = false) {
            path = this.escapePath(path);
            try {
                var list = this.readdirSync(path);
            }
            catch (e) {
                return [];
            }
            var length = list.length;
            if (!relative) {
                for (var i = length - 1; i >= 0; i--) {
                    if (list[i].charAt(0) == ".") {
                        list.splice(i, 1);
                    }
                    else {
                        list[i] = this.joinPath(path, list[i]);
                    }
                }
            }
            else {
                for (i = length - 1; i >= 0; i--) {
                    if (list[i].charAt(0) == ".") {
                        list.splice(i, 1);
                    }
                }
            }
            return list;
        }
        /**
         * 使用过滤函数搜索文件夹及其子文件夹下所有的文件
         * @param dir 要搜索的文件夹
         * @param filterFunc 过滤函数：filterFunc(file:File):Boolean,参数为遍历过程中的每一个文件，返回true则加入结果列表
         */
        searchBy(dir, filterFunc, checkDir) {
            var list = [];
            try {
                var stat = this.FS.statSync(dir);
            }
            catch (e) {
                return list;
            }
            if (stat.isDirectory()) {
                this.findFiles(dir, list, "", filterFunc, checkDir);
            }
            return list;
        }
        readdirSync(filePath) {
            var files = this.FS.readdirSync(filePath);
            files.sort();
            return files;
        }
        findFiles(filePath, list, extension, filterFunc, checkDir) {
            var files = this.readdirSync(filePath);
            var length = files.length;
            for (var i = 0; i < length; i++) {
                if (files[i].charAt(0) == ".") {
                    continue;
                }
                var path = this.joinPath(filePath, files[i]);
                let exists = this.FS.existsSync(path);
                if (!exists) {
                    continue;
                }
                var stat = this.FS.statSync(path);
                if (stat.isDirectory()) {
                    if (checkDir) {
                        if (filterFunc != null && !filterFunc(path)) {
                            continue;
                        }
                    }
                    this.findFiles(path, list, extension, filterFunc);
                }
                else if (filterFunc != null) {
                    if (filterFunc(path)) {
                        list.push(path);
                    }
                }
                else if (extension) {
                    var len = extension.length;
                    if (path.charAt(path.length - len - 1) == "." &&
                        path.substr(path.length - len, len).toLowerCase() == extension) {
                        list.push(path);
                    }
                }
                else {
                    list.push(path);
                }
            }
        }
        /**
         * 指定路径的文件或文件夹是否存在
         */
        exists(path) {
            path = this.escapePath(path);
            return this.FS.existsSync(path);
        }
        /**
         * 转换本机路径为Unix风格路径。
         */
        escapePath(path) {
            if (!path)
                return "";
            return path.split("\\").join("/");
        }
        /**
         * 连接路径,支持传入多于两个的参数。也支持"../"相对路径解析。返回的分隔符为Unix风格。
         */
        joinPath(dir, ...filename) {
            var path = this.Path.join.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }
        getRelativePath(dir, filename) {
            var relative = this.Path.relative(dir, filename);
            return this.escapePath(relative);
            ;
        }
        basename(p, ext) {
            var path = this.Path.basename.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }
        //获取相对路径 to相对于from的路径
        relative(from, to) {
            var path = this.Path.relative.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }
        searchPath(searchPaths) {
            for (let searchPath of searchPaths) {
                if (this.exists(searchPath)) {
                    return searchPath;
                }
            }
            return null;
        }
        existsSync(path) {
            return this.FS.existsSync(path);
        }
    }
    lingyu.FileUtil = FileUtil;
})(lingyu || (lingyu = {}));
var lingyu;
(function (lingyu) {
    class SourceMapCodec {
        constructor() {
            this.charToInteger = {};
            this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            for (let i = 0; i < this.chars.length; i++) {
                this.charToInteger[this.chars.charCodeAt(i)] = i;
            }
        }
        decode(mappings) {
            let generatedCodeColumn = 0; // first field
            let sourceFileIndex = 0; // second field
            let sourceCodeLine = 0; // third field
            let sourceCodeColumn = 0; // fourth field
            let nameIndex = 0; // fifth field
            const decoded = [];
            let line = [];
            let segment = [];
            for (let i = 0, j = 0, shift = 0, value = 0, len = mappings.length; i < len; i++) {
                const c = mappings.charCodeAt(i);
                if (c === 44) { // ","
                    if (segment.length)
                        line.push(new Int16Array(segment));
                    segment = [];
                    j = 0;
                }
                else if (c === 59) { // ";"
                    if (segment.length)
                        line.push(new Int16Array(segment));
                    segment = [];
                    j = 0;
                    decoded.push(line);
                    line = [];
                    generatedCodeColumn = 0;
                }
                else {
                    let integer = this.charToInteger[c];
                    if (integer === undefined) {
                        throw new Error('Invalid character (' + String.fromCharCode(c) + ')');
                    }
                    const hasContinuationBit = integer & 32;
                    integer &= 31;
                    value += integer << shift;
                    if (hasContinuationBit) {
                        shift += 5;
                    }
                    else {
                        const shouldNegate = value & 1;
                        value >>= 1;
                        const num = shouldNegate ? -value : value;
                        if (j == 0) {
                            generatedCodeColumn += num;
                            segment.push(generatedCodeColumn);
                        }
                        else if (j === 1) {
                            sourceFileIndex += num;
                            segment.push(sourceFileIndex);
                        }
                        else if (j === 2) {
                            sourceCodeLine += num;
                            segment.push(sourceCodeLine);
                        }
                        else if (j === 3) {
                            sourceCodeColumn += num;
                            segment.push(sourceCodeColumn);
                        }
                        else if (j === 4) {
                            nameIndex += num;
                            segment.push(nameIndex);
                        }
                        j++;
                        value = shift = 0; // reset
                    }
                }
            }
            if (segment.length)
                line.push(new Int16Array(segment));
            decoded.push(line);
            return decoded;
        }
        encode(decoded) {
            let sourceFileIndex = 0; // second field
            let sourceCodeLine = 0; // third field
            let sourceCodeColumn = 0; // fourth field
            let nameIndex = 0; // fifth field
            let mappings = '';
            for (let i = 0; i < decoded.length; i++) {
                const line = decoded[i];
                if (i > 0)
                    mappings += ';';
                if (line.length === 0)
                    continue;
                let generatedCodeColumn = 0; // first field
                const lineMappings = [];
                for (const segment of line) {
                    let segmentMappings = this.encodeInteger(segment[0] - generatedCodeColumn);
                    generatedCodeColumn = segment[0];
                    if (segment.length > 1) {
                        segmentMappings +=
                            this.encodeInteger(segment[1] - sourceFileIndex) +
                                this.encodeInteger(segment[2] - sourceCodeLine) +
                                this.encodeInteger(segment[3] - sourceCodeColumn);
                        sourceFileIndex = segment[1];
                        sourceCodeLine = segment[2];
                        sourceCodeColumn = segment[3];
                    }
                    if (segment.length === 5) {
                        segmentMappings += this.encodeInteger(segment[4] - nameIndex);
                        nameIndex = segment[4];
                    }
                    lineMappings.push(segmentMappings);
                }
                mappings += lineMappings.join(',');
            }
            return mappings;
        }
        encodeInteger(num) {
            var result = '';
            num = num < 0 ? (-num << 1) | 1 : num << 1;
            do {
                var clamped = num & 31;
                num >>= 5;
                if (num > 0) {
                    clamped |= 32;
                }
                result += this.chars[clamped];
            } while (num > 0);
            return result;
        }
    }
    lingyu.SourceMapCodec = SourceMapCodec;
})(lingyu || (lingyu = {}));
var lingyu;
(function (lingyu) {
    class Mj {
        constructor() {
            this.fs = new lingyu.FileUtil();
            this.codec = new lingyu.SourceMapCodec();
        }
        merge(projectRoot, args) {
            let url = projectRoot + "/manifest.json";
            var configObj = JSON.parse(this.fs.read(url));
            url = projectRoot + "/tsconfig.json";
            //var tsconfig = JSON.parse(this.fs.read(url));
            let data = "var egret = window.egret;";
            let key = "//# " + "sourceMappingURL=";
            let mapSources = [];
            let sourceMapps = [];
            let preLastSegment = new Int16Array([0, 0, 0, 0]);
            for (const item of configObj.game) {
                let fileContent = this.fs.read(item);
                let index = fileContent.indexOf(key);
                if (index == -1) {
                    continue;
                }
                let tsName = item;
                let spliceList = tsName.split("/");
                if (spliceList.length > 0) {
                    tsName = tsName.replace(spliceList[0] + "/", "");
                }
                tsName = tsName.replace(".js", ".ts");
                fileContent = fileContent.substring(0, index);
                let [map, lastSegment] = this.decodeMap(item, preLastSegment);
                if (map) {
                    mapSources.push(tsName);
                    data += fileContent;
                    preLastSegment = lastSegment;
                    sourceMapps.push(map);
                }
                else {
                    console.log("empty:" + item);
                }
            }
            let len = sourceMapps.length;
            if (len) {
                let fileName = "main.js";
                data += key + fileName + ".map\n;window.Main = Main;";
                this.fs.save("dist/" + fileName, data);
                //domap;
                let map = { version: 3, file: fileName, sourceRoot: "../src/", sources: mapSources, names: [], mappings: sourceMapps.join(";") };
                data = JSON.stringify(map);
                this.fs.save("dist/" + fileName + ".map", data);
            }
            console.log("merge total:" + len);
            //debug;
            /*let path = "dist/" + fileName + ".map";
            let map2: SourceMap = JSON.parse(this.fs.read(path));
            let test = map2.mappings;
            let decoded = this.codec.decode(test);
            data = JSON.stringify(decoded,);
            this.fs.save("dist/" + fileName + ".json", data);*/
        }
        decodeMap(url, preLastSegment) {
            let map = JSON.parse(this.fs.read(url + ".map"));
            let decoded = this.codec.decode(map.mappings);
            let lastSourceLine = 0;
            let lastSegment = new Int16Array(4);
            for (const line of decoded) {
                let len = line.length;
                if (len == 0) {
                    continue;
                }
                for (const segment of line) {
                    //旧值保留起来
                    lastSegment[1] = 1;
                    lastSegment[2] = segment[2];
                    lastSegment[3] = segment[3];
                    segment[1] = preLastSegment[1];
                    segment[2] -= preLastSegment[2];
                    segment[3] -= preLastSegment[3];
                }
            }
            return [this.codec.encode(decoded), lastSegment];
        }
    }
    lingyu.Mj = Mj;
})(lingyu || (lingyu = {}));
let projectRoot = process.cwd();
let mj = new lingyu.Mj();
mj.merge(projectRoot, process.argv.slice(2));
//# sourceMappingURL=Mj.js.map