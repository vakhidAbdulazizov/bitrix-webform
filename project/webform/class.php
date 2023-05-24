<?php


use Bitrix\Main\Engine\Contract\Controllerable;
use Bitrix\Main\Mail\Event;


class ProjectWebForm extends CBitrixComponent implements Controllerable
{
    public function configureActions()
    {
        return [
            'send' => [ // Ajax-метод
                'prefilters' => [],
            ],
        ];
    }

    public function sendAction($post)
    {
        $result = ['status' => 1];
        $errors = [];
        $this->arParams = $post['arParams'];

        if(!$this->arParams['CODE'])
            return ['status' => 0, 'errors' => ['Ошибка настройки форм']];

        $this->getData();


        $arFields = [];

        foreach($this->getIblockPropertyOptions() as $arProp)
        {
            $name = $arProp['NAME'];
            $code = $arProp['CODE'];
            $type = $arProp['TYPE'];
            $req = $arProp['IS_REQUIRED'];
            $value = $post['fields'][$code];

            if($type == 'MULTILINE')
            {
                $value = ['TEXT' => $value];
            }
            else if($type == 'FILE' && $value)
            {
                $value = json_decode($value, true);

                $tmp = \CFile::GetTempName('public_files', $value['name']);
                mkdir(dirname($tmp), 0755, true);
                file_put_contents($tmp, base64_decode($value['value']));

                $value = CFile::MakeFileArray($tmp);
            }

            if($req && !$value)
            {
                $errors[] = "Поле ${name} должно быть заполнено";
            }
            else if($type == 'EMAIL' && !check_email($value))
            {
                $errors[] = "Поле ${name} не корректно заполнено";
            }
            else
            {
                $arFields[$arProp['ID']] = $value;
            }
        }

        if(!$post['fields']['accept'])
        {
            $errors[] = "Необходимо согласиться с условиями оферты";
        }

        if($errors)
        {
            $result = [
                'status' => 0,
                'errors' => $errors
            ];
        }
        else
        {
            $iblock_id = $this->getIblockIdByCode($this->arParams['CODE']);
            $el = new CIBlockElement();
            $AID = $el->Add([
                'NAME' => 'Новая заявка от ('.date("j.m.Y H:i:s").')',
                'IBLOCK_ID' => $iblock_id,
                'ACTIVE' => 'Y',
                'PROPERTY_VALUES' => $arFields
            ]);

            if (isset($this->arParams['EVENT_NAME'])){
                Event::send(array(
                    "EVENT_NAME" => $this->arParams['EVENT_NAME'],
                    "LID" => "s1",
                    "C_FIELDS" => $post['fields'],
                ));
            }
        }

        return $result;
    }

    protected function getIblockIdByCode($code)
    {
        return \CIBlock::GetList([], ['CODE' => $code])->GetNext()['ID'];
    }

    protected function getPropertyType($prop)
    {
        if($prop['PROPERTY_TYPE'] === 'S')
        {
            if($prop['USER_TYPE'] === 'HTML')
            {
                return 'MULTILINE';
            }
        }
        elseif($prop['PROPERTY_TYPE'] == 'L')
        {
            return 'LIST';
        }
        elseif($prop['PROPERTY_TYPE'] == 'E')
        {
            return 'ELEMENT';
        }
        elseif($prop['PROPERTY_TYPE'] == 'F')
        {
            return 'FILE';
        }


        return 'TEXT';
    }

    protected function getIblockPropertyOptions()
    {
        $iblock_id = $this->getIblockIdByCode($this->arParams['CODE']);
        $props = [];
        $rs = CIBlockProperty::GetList([], ['IBLOCK_ID' => $iblock_id]);

        while($prop = $rs->GetNext())
        {
            $code = $prop['CODE'];

            $settings = [
                'ID' => $prop['ID'],
                'NAME' => $prop['NAME'],
                'CODE' => $code,
                'TYPE' => $this->getPropertyType($prop),
                'IS_REQUIRED' => $prop['IS_REQUIRED'] == 'Y',
                'HINT' => $prop['HINT'] ?: $prop['NAME']
            ];

            if($hook = $this->arParams['HOOK'][$code])
            {
                $settings = array_merge($settings, $hook);
            }

            if($prop['PROPERTY_TYPE'] == 'L')
            {
                $enumList = [];
                $propEnum = CIBlockPropertyEnum::GetList(["ID"=>"ASC"], ["IBLOCK_ID"=>$iblock_id, "CODE"=>$code]);
                while($enumData = $propEnum->GetNext())
                {
                    $enumList[$enumData['ID']] = $enumData['VALUE'];
                }
                $settings['LIST_VALUE'] = $enumList;

            }
            $props[] = $settings;
        }

        return $props;
    }

    protected function getData()
    {
        $this->arResult['PROPS'] = $this->getIblockPropertyOptions();
        $this->arResult['FORM_ID'] = $this->arParams['CODE']."_".$this->randString(10);
    }

    public function executeComponent()
    {
        $this->getData();
        \Bitrix\Main\Page\Asset::getInstance()->addJs($this->getPath().'/webform.js');

        $this->includeComponentTemplate('template');
    }
}