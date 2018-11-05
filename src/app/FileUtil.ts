type ActionT<T> = (T) => void;
type Action = () => void;

type FuncT<T, V> = (T) => V;
type Func<V> = () => V;

module lingyu {

    export class FileUtil {
        FS = require("fs");
        Path = require("path");

        charset = "utf-8";

        textTemp: { [index: string]: any } = {};

        /**
         * 保存数据到指定文件
         * @param path 文件完整路径名
         * @param data 要保存的数据
         */
        save(path: string, data: any): void {
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
        createDirectory(path: string, mode?: any): void {
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
                        if (!stat.isDirectory()) throw err0;
                        break;
                }
            }
        }

        /**
         * 读取文本文件,返回打开文本的字符串内容，若失败，返回"".
         * @param path 要打开的文件路径
         */
        read(path: string, ignoreCache = false): string {
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
        readBinary(path: string): any {
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
        copy(source: string, dest: string): void {
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

        isDirectory(path: string): boolean {
            path = this.escapePath(path);
            try {
                var stat = this.FS.statSync(path);
            }
            catch (e) {
                return false;
            }
            return stat.isDirectory();
        }

        isSymbolicLink(path: string): boolean {
            path = this.escapePath(path);
            try {
                var stat = this.FS.statSync(path);
            }
            catch (e) {
                return false;
            }
            return stat.isSymbolicLink();
        }

        isFile(path: string): boolean {
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
            this.createDirectory(this.Path.dirname(output_file))
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
        remove(path: string): void {
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
        getDirectory(path: string): string {
            path = this.escapePath(path);
            return this.Path.dirname(path) + "/";
        }

        /**
         * 获得路径的扩展名,不包含点字符。
         */
        getExtension(path: string): string {
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
        getFileName(path: string): string {
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
        getDirectoryListing(path: string, relative: boolean = false): string[] {
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
        searchBy(dir: string, filterFunc: FuncT<string, boolean>, checkDir?: boolean): string[] {
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

        readdirSync(filePath: string) {
            var files = this.FS.readdirSync(filePath);
            files.sort();
            return files;
        }

        findFiles(filePath: string, list: string[], extension: string, filterFunc?: FuncT<string, any>, checkDir?: boolean) {
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
        exists(path: string): boolean {
            path = this.escapePath(path);
            return this.FS.existsSync(path);
        }

        /**
         * 转换本机路径为Unix风格路径。
         */
        escapePath(path: string): string {
            if (!path)
                return "";
            return path.split("\\").join("/");
        }
        /**
         * 连接路径,支持传入多于两个的参数。也支持"../"相对路径解析。返回的分隔符为Unix风格。
         */
        joinPath(dir: string, ...filename: string[]): string {
            var path = this.Path.join.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }


        getRelativePath(dir: string, filename: string) {
            var relative = this.Path.relative(dir, filename);
            return this.escapePath(relative);;
        }

        basename(p: string, ext?: string): string {
            var path = this.Path.basename.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }

        //获取相对路径 to相对于from的路径
        relative(from: string, to: string) {
            var path = this.Path.relative.apply(null, arguments);
            path = this.escapePath(path);
            return path;
        }

        searchPath(searchPaths: string[]): string | null {
            for (let searchPath of searchPaths) {
                if (this.exists(searchPath)) {
                    return searchPath;
                }
            }
            return null;
        }

        existsSync(path: string): boolean {
            return this.FS.existsSync(path);
        }
    }
}