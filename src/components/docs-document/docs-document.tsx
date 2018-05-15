import { Component, Prop, State, Watch } from '@stencil/core';
// import { Helmet } from '@stencil/helmet';
import frontMatter from 'front-matter';
import { HeadingStruc, renderMarkdown } from '../../markdown';

@Component({
  tag: 'docs-document',
  styleUrls: [
    'docs-document.scss',
    'table-of-contents.scss'
  ]
})
export class DocsDocument {
  @Prop() path: string;
  @Prop() pageClass: string;
  @Prop() onLoaded: (document) => void;
  @Prop() isLoadingTimeout = 1000;
  @Prop() hash: string = null;
  @State() isLoading = false;
  @State() body: string;
  @State() title: string;
  @State() hideTOC = false;
  @State() frontMatter = {};
  @State() tocHeadings: HeadingStruc[] = [];

  loadingTimer = null;
  scrollPending: string = null;

  componentDidLoad() {
    return this.fetchDocument();
  }

  @Watch('path')
  fetchDocument() {
    this.setLoadingTimer();
    return fetch(`/docs/content/${this.path}.md`)
      .then(this.validateResponse)
      .then(this.parseDocument)
      .then(this.handleNewContent)
      .catch(this.handleFetchError);
  }

  validateResponse = res => {
    if (!res.ok) throw new Error(`Unable to fetch ${this.path}: ${res.statusText}`);
    return res;
  }

  parseDocument = res => {
    return res.text()
      .then(frontMatter)
      .then(this.stripTitle)
      .then(({ attributes, body }) => ({
          attributes,
          ...renderMarkdown(body, attributes)
      }));
  }

  handleNewContent = ({attributes, body, headings}) => {
    this.clearLoadingTimer();
    this.body = body;
    this.title = attributes.title;
    this.hideTOC = attributes.hideTOC;
    this.frontMatter = attributes;
    this.tocHeadings = this.hideTOC ? [] : headings;
    this.scrollPending = this.hash;
    this.onLoaded({
      ...attributes,
      body,
      headings,
      pageClass: this.pageClass
    });

  }

  handleFetchError = err => {
    this.clearLoadingTimer();
    this.title = '';
    this.hideTOC = true;
    this.body = err.message;
  }

  setLoadingTimer() {
    this.loadingTimer = setTimeout(() => {
      this.isLoading = true;
    }, this.isLoadingTimeout);
  }

  clearLoadingTimer() {
    clearTimeout(this.loadingTimer);
    this.isLoading = false;
  }

  stripTitle = ({ attributes, body }) => {
    const match = /^# (.*?)$/gm.exec(body);
    if (match) {
      const [ titleLine, title ] = match;
      body = body.replace(titleLine, '');
      attributes.title = attributes.title || title;
    }
    return { attributes, body };
  }

  scrollInToView(el) {
    if (!el || !el.scrollIntoView) return;
    el.scrollIntoView();
    this.scrollPending = null;
  }

  render() {
    if (this.isLoading) {
      return <loading-indicator/>;
    }

    const headings = this.tocHeadings.filter(heading => heading.level < 3);

    if (this.scrollPending) {
      setTimeout(() => {
        this.scrollInToView(document.querySelector(this.scrollPending));
      }, 0, this);
    }

    return [
      // <Helmet>
      //   <title>{ this.title ? `${this.title} - Ionic Docs` : 'Ionic Docs' }</title>
      // </Helmet>,
      <h1>{this.title}</h1>,
      <div class="table-of-contents">
        {(headings.length > 0) && !this.hideTOC ? [
        <strong class="toc-label">Contents</strong>,
        <ul class="toc-list">
          {headings.map(heading => {
            return (
              <li class="toc-item">
                <a href={`#${heading.anchorId}`} innerHTML={heading.text}></a>
              </li>
            );
          })}
        </ul>
        ] : null }
      </div>,
      <main innerHTML={this.body}/>,
      <docs-footer frontmatter={this.frontMatter}/>
    ];
  }
}
