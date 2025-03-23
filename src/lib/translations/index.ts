import i18next from 'i18next';
import en from '../translations/en.json';
import zh from '../translations/zh-CN.json';

i18next.init({
	lng: 'en',
	resources: {
		en: {
			translation: en,
		},
		'zh-CN': {
			translation: zh,
		},
	},
});

export default i18next;
