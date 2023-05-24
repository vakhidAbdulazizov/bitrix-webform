# Битрикс компонент веб форм

Компонент для формы, записывает информацию в инфоблок + есть возможность привязать почтовый шаблон

## Пример вызова компонента

```
<?$APPLICATION->IncludeComponent(
    "project:webform",
    "",
    Array(
        "CODE" => "",
        "EVENT_NAME" => ""
    )
);?>
```

* `CODE`  - символьный код инфоблока
* `EVENT_NAME`  - код почтового события (если надо)

## Шаблон компонента

Форме обязательно вешаем id

```
<form id="<?=$arResult['FORM_ID']?>">
</form>
```

Также в шаблоне вызываем скрипт

```
$(function () {
    let webform = new window.Project.Webform('<?=$arResult['FORM_ID']?>', <?=CUtil::PhpToJSObject($arParams)?>);
    webform.findSubmiters = function () {
        return this.findAll("селектор кнопки которая отвечает за отправку формы");
    }
    webform.OnSuccess = function (btn) {
       // при успешной отправке окажемся тут
    }
    webform.bind();
})
```

* `$arResult['PROPS']` - содержит массив свойств созданных в инфоблоке 