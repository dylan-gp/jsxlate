const mocha = require('mocha');
const {expect} = require('chai');
const sinon = require('sinon');

const {extract} = require('../src/extract');


describe('extraction', function() {
    describe('of strings', function() {
        it('extracts a string', function() {
            let messages = extract('i18n("foo")');

            expect(messages).to.eql(['foo']);
        });

        it('extracts multiple strings', function() {
            let messages = extract(`
                let foo = i18n("foo foo foo");
                let bar = i18n("foo, bar, foo");
                let baz = \`\${i18n('this is silly')}\`;
            `);

            expect(messages).to.eql([
                'foo foo foo',
                'foo, bar, foo',
                'this is silly'
            ]);
        })
    });

    describe('of jsx', function() {
        it('extracts simple strings', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        return <div>
                            <I18N>O, hai.</I18N>
                            <I18N>You look nice today!</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                'O, hai.',
                'You look nice today!'
            ]);
        });

        it('extracts strings with expressions', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N>O, hai, {name}.</I18N>
                            <I18N>You look nice today, {this.props.subject}!</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                'O, hai, {name}.',
                'You look nice today, {this.props.subject}!'
            ]);
        });

        it('extracts strings with nested components', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N>O, hai, <span>{name}</span>.</I18N>
                            <I18N>You look <em>nice</em> today, <strong>{this.props.subject}</strong>!</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                'O, hai, <span>{name}</span>.',
                'You look <em>nice</em> today, <strong>{this.props.subject}</strong>!'
            ]);
        });

        it('extracts strings with nested components with attributes', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N>O, hai, <span title="boop">{name}</span>.</I18N>
                            <I18N>You look <a href="#nice">nice</a> today, <strong>{this.props.subject}</strong>!</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                'O, hai, <span title="boop">{name}</span>.',
                'You look <a href="#nice">nice</a> today, <strong>{this.props.subject}</strong>!'
            ]);
        });

        it('extracts strings with nested components with i18n-id attributes', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N><span i18n-id="step-2" className="step-text">Step 2: </span>Add your organization to Idealist</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                '<span:step-2>Step 2: </span:step-2>Add your organization to Idealist'
            ]);
        });

        it('extracts strings with nested components with namespaced i18n-id', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N><span:step-2 className="step-text">Step 2: </span:step-2>Add your organization to Idealist</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                '<span:step-2>Step 2: </span:step-2>Add your organization to Idealist'
            ]);
        });

        it('extracts strings with nested components with no children', function() {
            let messages = extract(`
                React.createClass({
                    render() {
                        let name = this.props.name;
                        return <div>
                            <I18N>Line, <br title="boop"/>Break.</I18N>
                            <I18N>React <Components/>, am I right?</I18N>
                        </div>;
                    }
                })
            `);

            expect(messages).to.eql([
                'Line, <br title="boop" />Break.',
                'React <Components />, am I right?'
            ]);
        });

        it('does not assume an i18n-id is present when there are unsafe attributes', function() {
            let messages = extract(`
                <li><I18N><span i18n-id="stat" className="stat"><ReactIntl.FormattedNumber value={dailyVisitors}/></span>daily visitors</I18N></li>
            `);

            expect(messages).to.eql([
                '<span:stat><ReactIntl.FormattedNumber /></span:stat>daily visitors'
            ]);
        });

        it('deals correctly with whitespace', function() {
            let messages = extract(`<p id="are-we-eligible" className="in-form-link">
                <I18N>
                    <a href="/info/Help/Organizations#Eligibility">Are we eligible?</a>
                </I18N>
            </p>`);

            expect(messages).to.eql([
                '<a href="/info/Help/Organizations#Eligibility">Are we eligible?</a>'
            ]);
        });
    });

    describe('errors and warnings', function() {
        it('warns when it finds non-extractable whitelisted attributes', function() {
            let stub = sinon.stub(console, 'warn');
            extract('<I18N><a href={Router.url("about-us")}>click me</a></I18N>');
            expect(stub.callCount).to.equal(1);
            stub.restore();
        });

        it('throws an error when an element has sanitized attributes but no i18n-id', function() {
            expect(() => extract('<I18N>O, hai, <span className="boop">{name}</span>.</I18N>')).to.throw(Error);
        });

        it('does not require i18n-id on unique components', function() {
            expect(() => extract('<I18N>O, hai, <Component beep="boop">{name}</Component>.</I18N>')).to.not.throw(Error);
        });

        it('requires i18n-id on duplicated components', function() {
            expect(() => extract('<I18N>O, hai, <C beep="boop">{name}</C>, <C beep="boöp">{game}</C>.</I18N>')).to.throw(Error);
        });
    });
});