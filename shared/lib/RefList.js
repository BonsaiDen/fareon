// Reference List with O(1) based ID access -----------------------------------
// ----------------------------------------------------------------------------
function RefList(size) {

    this.size = size;
    this._refs = [];
    this.items = [];
    this.length = 0;

    for(var i = 0; i < size; i++) {
        this._refs.push(null);
    }

}

RefList.prototype = {

    add: function(ref) {

        if (this.length === this.size) {
            throw new Error('RefList exceeded size limit!');
        }

        this.items.push(ref);
        this.length++;

        for(var i = 0; i < this.size; i++) {
            if (this._refs[i] === null) {
                this._refs[i] = ref;
                return i;
            }
        }

    },

    set: function(id, ref) {

        if (this._refs[id] !== null) {
            throw new Error('RefList already contains reference for key ' + id);

        } else if (this.length === this.size) {
            throw new Error('RefList exceeded size limit!');

        } else {
            this._refs[id] = ref;
            this.items.push(ref);
            this.length++;
        }

    },

    get: function(id) {
        return this._refs[id];
    },

    remove: function(ref) {


        var index = this.items.indexOf(ref);
        if (index !== -1) {

            this.items.splice(index, 1);
            this.length --;

            for(var i = 0; i < this.size; i++) {
                if (this._refs[i] === ref) {
                    this._refs[i] = null;
                }
            }

        } else{
             throw new Error('RefList does not contain reference');
        }

    },

    resize: function(size) {

        this.clear();

        this.size = size;
        this._refs.length = 0;

        for(var i = 0; i < size; i++) {
            this._refs.push(null);
        }

    },

    clear: function() {

        this.items.length = 0;
        this.length = 0;

        for(var i = 0; i < this.size; i++) {
            this._refs[i] = null;
        }

    }

};


// Exports --------------------------------------------------------------------
module.exports = RefList;

