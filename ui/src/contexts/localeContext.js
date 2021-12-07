import * as React from "react";
import { IntlProvider } from "react-intl";
import { getLocale } from "../utils/locale";
import localeMessages from "../translations";

export const LocaleContext = React.createContext({});

export class LocaleProvider extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      locale: window.hubLang ? window.hubLang : getLocale(),
      options: [
        {
          displayName: "English",
          locale: "en",
        },
        {
          displayName: "繁體中文",
          locale: "zh-Hant",
        },
        {
          displayName: "简体中文",
          locale: "zh-Hans",
        },
        {
          displayName: "한국어",
          locale: "ko",
        },
        {
          displayName: "Tiếng việt",
          locale: "vi",
        },
        {
          displayName: "Türk dili",
          locale: "tr",
        },
        {
          displayName: "Indonesia",
          locale: "id",
        },
        {
          displayName: "日本語",
          locale: "ja",
        },
        {
          displayName: "Русский",
          locale: "ru",
        },
        {
          displayName: "Português",
          locale: "pt",
        },
        {
          displayName: "español",
          locale: "es",
        },
      ],
    };
  }

  changeLocale = (locale) => {
    this.setState({ locale });
  };

  render() {
    const store = {
      state: this.state,
      changeLocale: this.changeLocale,
    };

    const messages = localeMessages[this.state.locale];

    return (
      <LocaleContext.Provider value={store}>
        <IntlProvider
          key={this.state.locale}
          locale={this.state.locale}
          messages={messages}
          textComponent={React.Fragment}
        >
          {this.props.children}
        </IntlProvider>
      </LocaleContext.Provider>
    );
  }
}

export const LocaleConsumer = LocaleContext.Consumer;
