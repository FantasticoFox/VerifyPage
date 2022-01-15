import { Global } from "@emotion/react";

const Fonts = () => (
  <Global
    styles={`
      /* Montserrat */
      @font-face {
        font-family: 'Montserrat-Light';
        src: url('./fonts/Montserrat-Light.otf') format('opentype');
        font-weight: 300;
        font-style: normal;
      }
      @font-face {
        font-family: 'Montserrat-Regular';
        src: url('./fonts/Montserrat-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'Montserrat-SemiBold';
        src: url('./fonts/Montserrat-SemiBold.otf') format('opentype');
        font-weight: 600;
        font-style: italic;
      }
      @font-face {
        font-family: 'Montserrat-Bold';
        src: url('./fonts/Montserrat-Bold.otf') format('opentype');
        font-weight: 800;
        font-style: normal;
      }
      
      /* Source Sans Pro */
      @font-face {
        font-family: 'SourceSansPro-Regular';
        src: url('./fonts/SourceSansPro-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: 'SourceSansPro-Italic';
        src: url('./fonts/SourceSansPro-Italic.otf') format('opentype');
        font-weight: normal;
        font-style: italic;
      }
      @font-face {
        font-family: 'SourceSansPro-Semibold';
        src: url('./fonts/SourceSansPro-Semibold.otf') format('opentype');
        font-weight: 600;
        font-style: normal;
      }
      @font-face {
        font-family: 'SourceSansPro-SemiboldItalic';
        src: url('./fonts/SourceSansPro-SemiboldItalic.otf') format('opentype');
        font-weight: 600;
        font-style: italic;
      }
      @font-face {
        font-family: 'SourceSansPro-Bold';
        src: url('./fonts/SourceSansPro-Bold.otf') format('opentype');
        font-weight: 800;
        font-style: normal;
      }
      @font-face {
        font-family: 'SourceSansPro-BoldItalic';
        src: url('./fonts/SourceSansPro-BoldItalic.otf') format('opentype');
        font-weight: 800;
        font-style: italic;
      }
    `}
  />
);

export default Fonts;
