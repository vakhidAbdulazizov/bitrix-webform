if(!window.Project)
    window.Project = {};

window.Project.Ajax = function(component, method, data)
{
    let params = {
        mode: 'class',
        data: {post: data}
    };
    let bx_promise = BX.ajax.runComponentAction(component, method, params);
    return new Promise(function(resolve, reject){
        bx_promise.then(function(response) {
            if (response.status === 'success')
            {
                resolve(response);
            }
            else
            {
                reject();
            }
        });
    });
}

window.Project.Validity = {
    email: function(email) {
        let re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    input: function(input)
    {
        if(input.required && !input.value) return "Это поле должно быть заполнено";
        if(input.type === 'email' && !window.Project.Validity.email(input.value)) return "Некорректный email";
        if(input.type === 'checkbox' && input.classList.contains('visually-hidden') && !input.checked) return "Необходимо согласиться с условиями оферты";

        if(input.pattern)
        {
            const pa = new RegExp(".{18,18}")
            if(!pa.test(input.value)) return "Это поле заполненно некорректно";
        }

        console.log("[validity]", input);

        return false;
    }
};

window.Project.Webform = function(form_name, arParams)
{
    this.form_name = form_name;
    this.arParams = arParams;
    let self = this;
    this.ajax = function(data)
    {
        return window.Project.Ajax('project:webform', 'send', {
            fields: data,
            arParams: self.arParams
        })
    }
}

window.Project.Webform.prototype = {
    constructor: window.Project.Webform,
    find: function(selector)
    {
        return this.findContainer().querySelector(selector)
    },

    findAll: function(selector)
    {
        return this.findContainer().querySelectorAll(selector)
    },

    findInputs: function()
    {
        return this.findAll('input, select, textarea');
    },

    findContainer: function()
    {
        return document.forms[this.form_name];
    },

    findSubmiters: function()
    {
        return this.findAll('button.btn');
    },


    bind: function()
    {
        let self = this;
        this.findSubmiters().forEach(function(btn){
            btn.addEventListener('click', self.submit.bind(self, btn));
        });
        this.findAll('input[type=file]').forEach(function(file_input){
            let hidden = self.find("[name="+file_input.dataset.name+"]");
            if(hidden)
            {
                self.bindFile(new window.Project.WebformFile(file_input, hidden));
            }
        })

        this.bindCustom();
    },

    bindFile: function(webform_file)
    {

    },

    bindCustom: function()
    {

    },

    //////////////////////////////

    createHint(is_error, msg)
    {
        let hint = document.createElement('p');
        if(is_error)
        {
            hint.classList.add('form_error');
            hint.style.color = '#f00';
        }
        else
        {
            hint.classList.add('form_success');
            hint.style.color = 'rgb(5 154 5)';
        }

        hint.innerText = msg;
        return hint;
    },



    clearHints: function()
    {
        this.findAll('.form_error').forEach(function(ep){
            ep.parentNode.removeChild(ep);
        })

        this.findAll('.form_success').forEach(function(ep){
            ep.parentNode.removeChild(ep);
        })
    },

    attachHint(target, hint)
    {
        target.after(hint);
    },

    /////////////////////////

    collectAll: function()
    {
        let collect = {form: {}, js: []};
        this.findInputs().forEach(function(input){
            if(input.type === 'checkbox' || input.type === 'radio')
            {
                if(input.checked)collect.form[input.name] = input.value;
            }
            else
            {
                collect.form[input.name] = input.value;
            }
            collect.js.push(input);
        });

        return collect;
    },

    checkState: function()
    {
        let success = true;
        let self = this;

        this.collectAll().js.forEach(function(input){
            let error = window.Project.Validity.input(input);
            if(error) {
                self.attachHint(input, self.createHint(true, error));
                success = false;
            }
        });

        return success;
    },

    submit: function(btn, e)
    {
        e.preventDefault();
        this.clearHints();
        if(this.checkState())
        {
            let self = this;
            this.ajax(this.collectAll().form).then(function(response){
                if(response.data.status)
                {
                    self.OnSuccess(btn);
                }
                else
                {
                    for (let i in response.data.errors)
                    {
                        let error = response.data.errors[i];
                        self.attachHint(btn, self.createHint(true, error));
                    }
                }
            })
        }
    },

    OnSuccess: function(btn)
    {
        this.attachHint(btn, this.createHint(false, 'Форма успешно отправлена'));
        this.findContainer().reset();
    }
};


window.Project.WebformFile = function(input, hidden)
{
    this.input = input;
    this.hidden = hidden;
    this.proxy = new window.Project.Proxy();

    this.bind();
}

window.Project.WebformFile.prototype = {
    constructor: window.Project.WebformFile,
    bind: function()
    {
        this.input.addEventListener('change', this.update.bind(this));
    },

    update: function()
    {
        console.log("[file] update", this.input.files[0])
        let self = this;
        if(this.input.files && this.input.files[0])
        {
            let file = this.input.files[0];
            let reader = new FileReader();
            reader.onload = function(e)
            {
                self.hidden.value = JSON.stringify({
                    name: file.name,
                    value: btoa(e.target.result)
                });

                self.proxy.release(file.name);
            }

            reader.readAsBinaryString(file);
        }
        else
        {
            self.hidden.value = '';
        }
    },
}

window.Project.Proxy = function()
{
    this.handlers = [];
}

window.Project.Proxy.prototype = {
    assign: function(callback)
    {
        this.handlers.push(callback);
    },

    release: function(value)
    {
        this.handlers.forEach(function(handler){
            handler(value);
        })
    }
}