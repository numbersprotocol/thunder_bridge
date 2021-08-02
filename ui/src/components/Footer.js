import React from "react"
import { SocialIcons } from "./SocialIcons"
import { ReactComponent as TTLogoIcon } from "../assets/images/themes/core/logos/logo-thundercore.svg"
import { ReactComponent as TTIcon } from "../assets/images/themes/core/logos/logo-home.svg"
const config = require("../config.json")
import { injectIntl, FormattedMessage } from "react-intl"

const footer = `© ${config.year} ThunderCore Bridge`

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="link-container">
        <div className="outer-footer-link-container">
          <div className="inner-footer-link-container">
            <span className="divider-1">{"|"}</span>
            <a
              href="https://thundercore.com"
              target="_blank"
              className="footer-link"
            >
              ThunderCore
            </a>
          </div>
          <div className="inner-footer-link-container">
            <span className="divider-2">{"|"}</span>
            {/* <a
              href="https://bridge.thundercore.com/"
              target="_blank"
              className="footer-link"
            >
              <FormattedMessage id="components.i18n.Footer.thundercoreBridge" />
            </a> */}
            <a
              href="https://thundercore.zendesk.com/hc/en-us"
              target="_blank"
              className="footer-link"
            >
              <FormattedMessage id="components.i18n.Footer.helpCenter" />
            </a>
          </div>
        </div>
        <div className="outer-footer-link-container">
          <div className="inner-footer-link-container">
            <span className="divider-1">{"|"}</span>
            <a
              href="https://docs.thundercore.com/docs/Thunder-Bridge-audit-en.pdf"
              target="_blank"
              className="footer-link"
            >
              <FormattedMessage id="components.i18n.Footer.auditReport" />
            </a>
          </div>
          <div className="inner-footer-link-container">
            {/* <span className="divider-2">{"|"}</span>
            <a
              href="https://thundercore.zendesk.com/hc/en-us"
              target="_blank"
              className="footer-link"
            >
              <FormattedMessage id="components.i18n.Footer.helpCenter" />
            </a> */}
          </div>
        </div>
      </div>
      <SocialIcons />
    </div>
    <p>{footer}</p>
  </footer>
)

export default injectIntl(Footer)
