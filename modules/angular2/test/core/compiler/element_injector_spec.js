import {describe, ddescribe, it, iit, xit, xdescribe, expect, beforeEach, SpyObject, proxy, el} from 'angular2/test_lib';
import {isBlank, isPresent, IMPLEMENTS} from 'angular2/src/facade/lang';
import {ListWrapper, MapWrapper, List, StringMapWrapper, iterateListLike} from 'angular2/src/facade/collection';
import {ProtoElementInjector, ElementInjector, PreBuiltObjects, DirectiveBinding, TreeNode}
    from 'angular2/src/core/compiler/element_injector';
import {Parent, Ancestor, Unbounded} from 'angular2/src/core/annotations_impl/visibility';
import {Attribute, Query} from 'angular2/src/core/annotations_impl/di';
import {Component, Directive, onDestroy} from 'angular2/src/core/annotations_impl/annotations';
import {bind, Injector, Binding} from 'angular2/di';
import {Optional, Inject} from 'angular2/src/di/annotations_impl';
import {AppProtoView, AppView} from 'angular2/src/core/compiler/view';
import {ViewContainerRef} from 'angular2/src/core/compiler/view_container_ref';
import {ProtoViewRef} from 'angular2/src/core/compiler/view_ref';
import {ElementRef} from 'angular2/src/core/compiler/element_ref';
import {DynamicChangeDetector, ChangeDetectorRef, Parser, Lexer} from 'angular2/change_detection';
import {ViewRef, Renderer} from 'angular2/src/render/api';
import {QueryList} from 'angular2/src/core/compiler/query_list';

class DummyDirective extends Component {
  constructor({lifecycle, events, hostActions, hostInjector, viewInjector} = {}) {
    super({lifecycle: lifecycle, events: events, hostActions: hostActions, hostInjector: hostInjector, viewInjector: viewInjector});
  }
}

@proxy
@IMPLEMENTS(AppView)
class DummyView extends SpyObject {
  componentChildViews;
  changeDetector;
  constructor() {
    super();
    this.componentChildViews = [];
    this.changeDetector = null;
  }
  noSuchMethod(m){return super.noSuchMethod(m);}
}


class SimpleDirective {
}

class SimpleService {
}

class SomeOtherDirective {
}

var _constructionCount = 0;
class CountingDirective {
  count;
  constructor() {
    this.count = _constructionCount;
    _constructionCount += 1;
  }
}

class FancyCountingDirective extends CountingDirective {
  constructor() {
    super();
  }
}

class NeedsDirective {
  dependency:SimpleDirective;
  constructor(dependency:SimpleDirective){
    this.dependency = dependency;
  }
}

class OptionallyNeedsDirective {
  dependency:SimpleDirective;
  constructor(@Optional() dependency:SimpleDirective){
    this.dependency = dependency;
  }
}

class NeedsDirectiveFromParent {
  dependency:SimpleDirective;
  constructor(@Parent() dependency:SimpleDirective){
    this.dependency = dependency;
  }
}

class NeedsDirectiveFromAncestor {
  dependency:SimpleDirective;
  constructor(@Ancestor() dependency:SimpleDirective){
    this.dependency = dependency;
  }
}

class NeedsDirectiveFromAnAncestorShadowDom {
  dependency:SimpleDirective;
  constructor(@Unbounded() dependency:SimpleDirective){
    this.dependency = dependency;
  }
}

class NeedsService {
  service:any;
  constructor(@Inject("service") service) {
    this.service = service;
  }
}

class HasEventEmitter {
  emitter;
  constructor() {
    this.emitter = "emitter";
  }
}

class HasHostAction {
  hostActionName;
  constructor() {
    this.hostActionName = "hostAction";
  }
}

class NeedsAttribute {
  typeAttribute;
  titleAttribute;
  fooAttribute;
  constructor(@Attribute('type') typeAttribute: String, @Attribute('title') titleAttribute: String, @Attribute('foo') fooAttribute: String) {
    this.typeAttribute = typeAttribute;
    this.titleAttribute = titleAttribute;
    this.fooAttribute = fooAttribute;
  }
}

class NeedsAttributeNoType {
  fooAttribute;
  constructor(@Attribute('foo') fooAttribute) {
    this.fooAttribute = fooAttribute;
  }
}

class NeedsQuery {
  query: QueryList;
  constructor(@Query(CountingDirective) query: QueryList) {
    this.query = query;
  }
}

class NeedsElementRef {
  elementRef;
  constructor(ref:ElementRef) {
    this.elementRef = ref;
  }
}

class NeedsViewContainer {
  viewContainer;
  constructor(vc:ViewContainerRef) {
    this.viewContainer = vc;
  }
}

class NeedsProtoViewRef {
  protoViewRef;
  constructor(ref:ProtoViewRef) {
    this.protoViewRef = ref;
  }
}

class OptionallyInjectsProtoViewRef {
  protoViewRef;
  constructor(@Optional() ref:ProtoViewRef) {
    this.protoViewRef = ref;
  }
}

class NeedsChangeDetectorRef {
  changeDetectorRef;
  constructor(cdr:ChangeDetectorRef) {
    this.changeDetectorRef = cdr;
  }
}

class A_Needs_B {
  constructor(dep){}
}

class B_Needs_A {
  constructor(dep){}
}

class DirectiveWithDestroy {
  onDestroyCounter:number;

  constructor(){
    this.onDestroyCounter = 0;
  }

  onDestroy() {
    this.onDestroyCounter ++;
  }
}

class TestNode extends TreeNode {
  message: string;
  constructor(parent:TestNode, message) {
    super(parent);
    this.message = message;
  }
  toString() {
    return this.message;
  }
}

export function main() {
  var defaultPreBuiltObjects = new PreBuiltObjects(null, null, null);
  var appInjector = Injector.resolveAndCreate([]);

  function createPei(parent, index, bindings, distance = 1, hasShadowRoot = false) {
    var directiveBinding =  ListWrapper.map(bindings, b => {
      if (b instanceof DirectiveBinding) return b;
      if (b instanceof Binding) return DirectiveBinding.createFromBinding(b, null);
      return DirectiveBinding.createFromType(b, null);
    });
    return ProtoElementInjector.create(parent, index, directiveBinding, hasShadowRoot, distance);
  }

  function humanize(tree, names:List) {
    var lookupName = (item) =>
        ListWrapper.last(
            ListWrapper.find(names, (pair) => pair[0] === item));

    if (tree.children.length == 0) return lookupName(tree);
    var children = tree.children.map(m => humanize(m, names));
    return [lookupName(tree), children];
  }

  function injector(bindings, lightDomAppInjector = null,
                    isComponent:bool = false, preBuiltObjects = null, attributes = null) {
    if (isBlank(lightDomAppInjector)) lightDomAppInjector = appInjector;

    var proto =  createPei(null, 0, bindings, 0, isComponent);
    proto.attributes = attributes;

    var inj = proto.instantiate(null);
    var preBuilt = isPresent(preBuiltObjects) ? preBuiltObjects : defaultPreBuiltObjects;
    inj.hydrate(lightDomAppInjector, null, preBuilt);
    return inj;
  }

  function parentChildInjectors(parentBindings, childBindings, parentPreBuildObjects = null) {
    if (isBlank(parentPreBuildObjects)) parentPreBuildObjects = defaultPreBuiltObjects;

    var inj = Injector.resolveAndCreate([]);


    var protoParent =  createPei(null, 0, parentBindings);
    var parent = protoParent.instantiate(null);

    parent.hydrate(inj, null, parentPreBuildObjects);

    var protoChild =  createPei(protoParent, 1, childBindings, 1, false);
    var child = protoChild.instantiate(parent);
    child.hydrate(inj, null, defaultPreBuiltObjects);

    return child;
  }

  function hostShadowInjectors(hostBindings:List, shadowBindings:List):ElementInjector {
    var inj = Injector.resolveAndCreate([]);

    var protoHost =  createPei(null, 0, hostBindings, 0, true);
    var host = protoHost.instantiate(null);
    host.hydrate(inj, null, defaultPreBuiltObjects);

    var protoShadow =  createPei(null, 0, shadowBindings, 0, false);
    var shadow = protoShadow.instantiate(null);
    shadow.hydrate(host.getShadowDomAppInjector(), host, null);

    return shadow;
  }

  describe('TreeNodes', () => {
    var root, firstParent, lastParent, node;

    /*
     Build a tree of the following shape:
     root
      - p1
         - c1
         - c2
      - p2
        - c3
     */
    beforeEach(() => {
      root = new TestNode(null, 'root');
      var p1 = firstParent = new TestNode(root, 'p1');
      var p2 = lastParent = new TestNode(root, 'p2');
      node = new TestNode(p1, 'c1');
      new TestNode(p1, 'c2');
      new TestNode(p2, 'c3');
    });

    // depth-first pre-order.
    function walk(node, f) {
      if (isBlank(node)) return f;
      f(node);
      ListWrapper.forEach(node.children, (n) => walk(n, f));
    }

    function logWalk(node) {
      var log = '';
      walk(node, (n) => {
        log += (log.length != 0 ? ', ' : '') + n.toString();
      });
      return log;
    }

    it('should support listing children', () => {
      expect(logWalk(root)).toEqual('root, p1, c1, c2, p2, c3');
    });

    it('should support removing the first child node', () => {
      firstParent.remove();

      expect(firstParent.parent).toEqual(null);
      expect(logWalk(root)).toEqual('root, p2, c3');
    });

    it('should support removing the last child node', () => {
      lastParent.remove();

      expect(logWalk(root)).toEqual('root, p1, c1, c2');
    });

    it('should support moving a node at the end of children', () => {
      node.remove();
      root.addChild(node);

      expect(logWalk(root)).toEqual('root, p1, c2, p2, c3, c1');
    });

    it('should support moving a node in the beginning of children', () => {
      node.remove();
      lastParent.addChildAfter(node, null);

      expect(logWalk(root)).toEqual('root, p1, c2, p2, c1, c3');
    });

    it('should support moving a node in the middle of children', () => {
      node.remove();
      lastParent.addChildAfter(node, firstParent);

      expect(logWalk(root)).toEqual('root, p1, c2, c1, p2, c3');
    });
  });



  describe("ProtoElementInjector", () => {
    describe("direct parent", () => {
      it("should return parent proto injector when distance is 1", () => {
        var distance = 1;
        var protoParent = createPei(null, 0, []);
        var protoChild = createPei(protoParent, 0, [], distance, false);

        expect(protoChild.directParent()).toEqual(protoParent);
      });

      it("should return null otherwise", () => {
        var distance = 2;
        var protoParent = createPei(null, 0, []);
        var protoChild = createPei(protoParent, 0, [], distance, false);

        expect(protoChild.directParent()).toEqual(null);
      });

      it("should allow for direct access using getBindingAtIndex", function () {
        var binding = DirectiveBinding.createFromBinding(
            bind(SimpleDirective).toClass(SimpleDirective), null);
        var proto = createPei(null, 0, [binding]);

        expect(proto.getBindingAtIndex(0)).toBeAnInstanceOf(DirectiveBinding);
        expect(() => proto.getBindingAtIndex(-1)).toThrowError(
            'Index -1 is out-of-bounds.');
        expect(() => proto.getBindingAtIndex(10)).toThrowError(
            'Index 10 is out-of-bounds.');
      });
    });

    describe('event emitters', () => {
      it('should return a list of event accessors', () => {
        var binding = DirectiveBinding.createFromType(
            HasEventEmitter, new DummyDirective({events: ['emitter']}));

        var inj = createPei(null, 0, [binding]);
        expect(inj.eventEmitterAccessors.length).toEqual(1);

        var accessor = inj.eventEmitterAccessors[0][0];
        expect(accessor.eventName).toEqual('emitter');
        expect(accessor.getter(new HasEventEmitter())).toEqual('emitter');
      });

      it('should return a list of hostAction accessors', () => {
        var binding = DirectiveBinding.createFromType(
            HasEventEmitter, new DummyDirective({hostActions: {'hostActionName' : 'onAction'}}));

        var inj = createPei(null, 0, [binding]);
        expect(inj.hostActionAccessors.length).toEqual(1);

        var accessor = inj.hostActionAccessors[0][0];
        expect(accessor.actionExpression).toEqual('onAction');
        expect(accessor.getter(new HasHostAction())).toEqual('hostAction');
      });
    });


    describe(".create", () => {
      it("should collect hostInjector injectables from all directives", () => {
        var pei = createPei(null, 0, [
          DirectiveBinding.createFromType(SimpleDirective,
              new DummyDirective({hostInjector: [bind('injectable1').toValue('injectable1')]})),
          DirectiveBinding.createFromType(SomeOtherDirective,
              new DummyDirective({hostInjector: [bind('injectable2').toValue('injectable2')]}))
        ]);

        expect(pei.getBindingAtIndex(0).key.token).toBe(SimpleDirective);
        expect(pei.getBindingAtIndex(1).key.token).toBe(SomeOtherDirective);
        expect(pei.getBindingAtIndex(2).key.token).toEqual("injectable1");
        expect(pei.getBindingAtIndex(3).key.token).toEqual("injectable2");
      });

      it("should collect viewInjector injectables from the component", () => {
        var pei = createPei(null, 0, [
          DirectiveBinding.createFromType(SimpleDirective,
              new DummyDirective({viewInjector: [bind('injectable1').toValue('injectable1')]}))
        ], 0, true);

        expect(pei.getBindingAtIndex(0).key.token).toBe(SimpleDirective);
        expect(pei.getBindingAtIndex(1).key.token).toEqual("injectable1");
      });
    });
  });

  describe("ElementInjector", function () {
    describe("instantiate", function () {
      it("should create an element injector", function () {
        var protoParent = createPei(null, 0, []);
        var protoChild1 = createPei(protoParent, 1, []);
        var protoChild2 = createPei(protoParent, 2, []);

        var p = protoParent.instantiate(null);
        var c1 = protoChild1.instantiate(p);
        var c2 = protoChild2.instantiate(p);

        expect(humanize(p, [
          [p, 'parent'],
          [c1, 'child1'],
          [c2, 'child2']
        ])).toEqual(["parent", ["child1", "child2"]]);
      });

      describe("direct parent", () => {
        it("should return parent injector when distance is 1", () => {
          var distance = 1;
          var protoParent = createPei(null, 0, []);
          var protoChild = createPei(protoParent, 1, [], distance);

          var p = protoParent.instantiate(null);
          var c = protoChild.instantiate(p);

          expect(c.directParent()).toEqual(p);
        });

        it("should return null otherwise", () => {
          var distance = 2;
          var protoParent = createPei(null, 0, []);
          var protoChild = createPei(protoParent, 1, [], distance);

          var p = protoParent.instantiate(null);
          var c = protoChild.instantiate(p);

          expect(c.directParent()).toEqual(null);
        });
      });
    });

    describe("hasBindings", function () {
      it("should be true when there are bindings", function () {
        var p = createPei(null, 0, [SimpleDirective]);
        expect(p.hasBindings).toBeTruthy();
      });

      it("should be false otherwise", function () {
        var p = createPei(null, 0, []);
        expect(p.hasBindings).toBeFalsy();
      });
    });

    describe("hasInstances", function () {
      it("should be false when no directives are instantiated", function () {
        expect(injector([]).hasInstances()).toBe(false);
      });

      it("should be true when directives are instantiated", function () {
        expect(injector([SimpleDirective]).hasInstances()).toBe(true);
      });
    });

    describe("hydrate", function () {
      it("should instantiate directives that have no dependencies", function () {
        var inj = injector([SimpleDirective]);
        expect(inj.get(SimpleDirective)).toBeAnInstanceOf(SimpleDirective);
      });

      it("should instantiate directives that depend on other directives", function () {
        var inj = injector([SimpleDirective, NeedsDirective]);

        var d = inj.get(NeedsDirective);

        expect(d).toBeAnInstanceOf(NeedsDirective);
        expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should instantiate directives that depend on app services", function () {
        var appInjector = Injector.resolveAndCreate([
          bind("service").toValue("service")
        ]);
        var inj = injector([NeedsService], appInjector);

        var d = inj.get(NeedsService);
        expect(d).toBeAnInstanceOf(NeedsService);
        expect(d.service).toEqual("service");
      });

      it("should instantiate directives that depend on pre built objects", function () {
        var protoView = new AppProtoView(null, null, null);
        var inj = injector([NeedsProtoViewRef], null, false, new PreBuiltObjects(null, null, protoView));

        expect(inj.get(NeedsProtoViewRef).protoViewRef).toEqual(new ProtoViewRef(protoView));
      });

      it("should return app services", function () {
        var appInjector = Injector.resolveAndCreate([
          bind("service").toValue("service")
        ]);
        var inj = injector([], appInjector);

        expect(inj.get('service')).toEqual('service');
      });

      it("should get directives from parent", function () {
        var child = parentChildInjectors([SimpleDirective], [NeedsDirectiveFromParent]);

        var d = child.get(NeedsDirectiveFromParent);

        expect(d).toBeAnInstanceOf(NeedsDirectiveFromParent);
        expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should not return parent's directives on self", function () {
        expect(() => {
          injector([SimpleDirective, NeedsDirectiveFromParent]);
        }).toThrowError(new RegExp("No provider for SimpleDirective"));
      });

      it("should get directives from ancestor", function () {
        var child = parentChildInjectors([SimpleDirective], [NeedsDirectiveFromAncestor]);

        var d = child.get(NeedsDirectiveFromAncestor);

        expect(d).toBeAnInstanceOf(NeedsDirectiveFromAncestor);
        expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should get directives crossing the boundaries", function () {
        var child = hostShadowInjectors([SomeOtherDirective, SimpleDirective],
            [NeedsDirectiveFromAnAncestorShadowDom]);

        var d = child.get(NeedsDirectiveFromAnAncestorShadowDom);

        expect(d).toBeAnInstanceOf(NeedsDirectiveFromAnAncestorShadowDom);
        expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should throw when a depenency cannot be resolved", function () {
        expect(() => injector([NeedsDirectiveFromParent])).
            toThrowError('No provider for SimpleDirective! (NeedsDirectiveFromParent -> SimpleDirective)');
      });

      it("should inject null when an optional dependency cannot be resolved", function () {
        var inj = injector([OptionallyNeedsDirective]);
        var d = inj.get(OptionallyNeedsDirective);
        expect(d.dependency).toEqual(null);
      });

      it("should accept bindings instead types", function () {
        var inj = injector([
          DirectiveBinding.createFromBinding(bind(SimpleDirective).toClass(SimpleDirective), null)
        ]);
        expect(inj.get(SimpleDirective)).toBeAnInstanceOf(SimpleDirective);
      });

      it("should allow for direct access using getDirectiveAtIndex", function () {
        var inj = injector([
          DirectiveBinding.createFromBinding(bind(SimpleDirective).toClass(SimpleDirective), null)
        ]);
        expect(inj.getDirectiveAtIndex(0)).toBeAnInstanceOf(SimpleDirective);
        expect(() => inj.getDirectiveAtIndex(-1)).toThrowError(
            'Index -1 is out-of-bounds.');
        expect(() => inj.getDirectiveAtIndex(10)).toThrowError(
            'Index 10 is out-of-bounds.');
      });


      it("should handle cyclic dependencies", function () {
        expect(() => {
          var bAneedsB = bind(A_Needs_B).toFactory((a) => new A_Needs_B(a), [B_Needs_A]);
          var bBneedsA = bind(B_Needs_A).toFactory((a) => new B_Needs_A(a), [A_Needs_B]);
          injector([
            DirectiveBinding.createFromBinding(bAneedsB, null),
            DirectiveBinding.createFromBinding(bBneedsA, null)
          ]);
        }).toThrowError('Cannot instantiate cyclic dependency! ' +
            '(A_Needs_B -> B_Needs_A -> A_Needs_B)');
      });

      describe("shadow DOM components", () => {
        it("should instantiate directives that depend on the containing component", function () {
          var directiveBinding = DirectiveBinding.createFromType(SimpleDirective, new Component());
          var shadow = hostShadowInjectors([directiveBinding], [NeedsDirective]);

          var d = shadow.get(NeedsDirective);
          expect(d).toBeAnInstanceOf(NeedsDirective);
          expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
        });

        it("should not instantiate directives that depend on other directives in the containing component's ElementInjector", () => {
          var directiveBinding = DirectiveBinding.createFromType(SomeOtherDirective, new Component());
          expect(() => {
            hostShadowInjectors([directiveBinding, SimpleDirective],[NeedsDirective]);
          }).toThrowError('No provider for SimpleDirective! (NeedsDirective -> SimpleDirective)');
        });

        it("should instantiate component directives that depend on app services in the shadow app injector", () => {
          var directiveAnnotation = new Component({
            appInjector: [
              bind("service").toValue("service")
            ]
          });
          var componentDirective = DirectiveBinding.createFromType(
              NeedsService, directiveAnnotation);
          var inj = injector([componentDirective], null, true);

          var d = inj.get(NeedsService);
          expect(d).toBeAnInstanceOf(NeedsService);
          expect(d.service).toEqual("service");
        });

        it("should not instantiate other directives that depend on app services in the shadow app injector", () => {
          var directiveAnnotation = new Component({
            appInjector: [
              bind("service").toValue("service")
            ]
          });
          var componentDirective = DirectiveBinding.createFromType(SimpleDirective, directiveAnnotation);
          expect(() => {
            injector([componentDirective, NeedsService], null);
          }).toThrowError('No provider for service! (NeedsService -> service)');
        });
      });
    });
    
    describe("lifecycle", () => {
      it("should call onDestroy on directives subscribed to this event", function() {
        var inj = injector([DirectiveBinding.createFromType(DirectiveWithDestroy, new DummyDirective({lifecycle: [onDestroy]}))]);
        var destroy = inj.get(DirectiveWithDestroy);
        inj.dehydrate();
        expect(destroy.onDestroyCounter).toBe(1);
      });

      it("should work with services", function() {
        var inj = injector([DirectiveBinding.createFromType(SimpleDirective, new DummyDirective({hostInjector: [SimpleService]}))]);
        inj.dehydrate();
      });
    });

    describe("dynamicallyCreateComponent", () => {
      it("should create a component dynamically", () => {
        var inj = injector([]);

        inj.dynamicallyCreateComponent(DirectiveBinding.createFromType(SimpleDirective, null), appInjector);
        expect(inj.getDynamicallyLoadedComponent()).toBeAnInstanceOf(SimpleDirective);
        expect(inj.get(SimpleDirective)).toBeAnInstanceOf(SimpleDirective);
      });

      it("should inject parent dependencies into the dynamically-loaded component", () => {
        var inj = parentChildInjectors([SimpleDirective], []);
        inj.dynamicallyCreateComponent(DirectiveBinding.createFromType(NeedsDirectiveFromAncestor, null), appInjector);
        expect(inj.getDynamicallyLoadedComponent()).toBeAnInstanceOf(NeedsDirectiveFromAncestor);
        expect(inj.getDynamicallyLoadedComponent().dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should not inject the proxy component into the children of the dynamically-loaded component", () => {
        var injWithDynamicallyLoadedComponent = injector([SimpleDirective]);
        injWithDynamicallyLoadedComponent.dynamicallyCreateComponent(DirectiveBinding.createFromType(SomeOtherDirective, null), appInjector);

        var shadowDomProtoInjector = createPei(null, 0, [NeedsDirectiveFromAncestor]);
        var shadowDomInj = shadowDomProtoInjector.instantiate(null);

        expect(() =>
            shadowDomInj.hydrate(appInjector, injWithDynamicallyLoadedComponent, defaultPreBuiltObjects)).
            toThrowError(new RegExp("No provider for SimpleDirective"));
      });

      it("should not inject the dynamically-loaded component into directives on the same element", () => {
        var dynamicComp = DirectiveBinding.createFromType(SomeOtherDirective, new Component());
        var proto = createPei(null, 0, [dynamicComp, NeedsDirective], 1, true);
        var inj = proto.instantiate(null);
        inj.dynamicallyCreateComponent(
            DirectiveBinding.createFromType(SimpleDirective, null), appInjector);

        var error = null;
        try {
          inj.hydrate(Injector.resolveAndCreate([]), null, null);
        } catch(e) {
          error = e;
        }

        expect(error.message).toEqual("No provider for SimpleDirective! (NeedsDirective -> SimpleDirective)");
      });

      it("should inject the dynamically-loaded component into the children of the dynamically-loaded component", () => {
        var componentDirective = DirectiveBinding.createFromType(SimpleDirective, null);
        var injWithDynamicallyLoadedComponent = injector([]);
        injWithDynamicallyLoadedComponent.dynamicallyCreateComponent(componentDirective, appInjector);

        var shadowDomProtoInjector = createPei(null, 0, [NeedsDirectiveFromAncestor]);
        var shadowDomInjector = shadowDomProtoInjector.instantiate(null);
        shadowDomInjector.hydrate(appInjector, injWithDynamicallyLoadedComponent, defaultPreBuiltObjects);

        expect(shadowDomInjector.get(NeedsDirectiveFromAncestor)).toBeAnInstanceOf(NeedsDirectiveFromAncestor);
        expect(shadowDomInjector.get(NeedsDirectiveFromAncestor).dependency).toBeAnInstanceOf(SimpleDirective);
      });

      it("should remove the dynamically-loaded component when dehydrating", () => {
        var inj = injector([]);
        inj.dynamicallyCreateComponent(
            DirectiveBinding.createFromType(
                DirectiveWithDestroy,
                new DummyDirective({lifecycle: [onDestroy]})
            ),
            appInjector);
        var dir = inj.getDynamicallyLoadedComponent();

        inj.dehydrate();

        expect(inj.getDynamicallyLoadedComponent()).toBe(null);
        expect(dir.onDestroyCounter).toBe(1);

        inj.hydrate(null, null, null);

        expect(inj.getDynamicallyLoadedComponent()).toBe(null);
      });

      it("should inject services of the dynamically-loaded component", () => {
        var inj = injector([]);
        var appInjector = Injector.resolveAndCreate([bind("service").toValue("Service")]);
        inj.dynamicallyCreateComponent(DirectiveBinding.createFromType(NeedsService, null), appInjector);
        expect(inj.getDynamicallyLoadedComponent().service).toEqual("Service");
      });
    });

    describe('static attributes', () => {
      it('should be injectable', () => {
        var attributes = MapWrapper.create();
        MapWrapper.set(attributes, 'type', 'text');
        MapWrapper.set(attributes, 'title', '');

        var inj = injector([NeedsAttribute], null, false, null, attributes);
        var needsAttribute = inj.get(NeedsAttribute);

        expect(needsAttribute.typeAttribute).toEqual('text');
        expect(needsAttribute.titleAttribute).toEqual('');
        expect(needsAttribute.fooAttribute).toEqual(null);
      });

      it('should be injectable without type annotation', () => {
        var attributes = MapWrapper.create();
        MapWrapper.set(attributes, 'foo', 'bar');

        var inj = injector([NeedsAttributeNoType], null, false, null, attributes);
        var needsAttribute = inj.get(NeedsAttributeNoType);

        expect(needsAttribute.fooAttribute).toEqual('bar');
      });
    });

    describe("refs", () => {
      it("should inject ElementRef", () => {
        var inj = injector([NeedsElementRef]);
        expect(inj.get(NeedsElementRef).elementRef).toBeAnInstanceOf(ElementRef);
      });

      it('should inject ChangeDetectorRef', function () {
        var cd = new DynamicChangeDetector(null, null, null, [], []);
        var view = new DummyView();
        var childView = new DummyView();
        childView.changeDetector = cd;
        view.componentChildViews = [childView];
        var inj = injector([NeedsChangeDetectorRef], null, false, new PreBuiltObjects(null, view, null));

        expect(inj.get(NeedsChangeDetectorRef).changeDetectorRef).toBe(cd.ref);
      });

      it('should inject ViewContainerRef', () => {
        var inj = injector([NeedsViewContainer]);
        expect(inj.get(NeedsViewContainer).viewContainer).toBeAnInstanceOf(ViewContainerRef);
      });

      it("should inject ProtoViewRef", function () {
        var protoView = new AppProtoView(null, null, null);
        var inj = injector([NeedsProtoViewRef], null, false, new PreBuiltObjects(null, null, protoView));

        expect(inj.get(NeedsProtoViewRef).protoViewRef).toEqual(new ProtoViewRef(protoView));
      });

      it("should throw if there is no ProtoViewRef", function () {
        expect(
            () => injector([NeedsProtoViewRef])
        ).toThrowError('No provider for ProtoViewRef! (NeedsProtoViewRef -> ProtoViewRef)');
      });

      it('should inject null if there is no ProtoViewRef when the dependency is optional', () => {
        var inj = injector([OptionallyInjectsProtoViewRef]);
        var instance = inj.get(OptionallyInjectsProtoViewRef);
        expect(instance.protoViewRef).toBeNull();
      });
    });

    describe('directive queries', () => {
      var preBuildObjects = defaultPreBuiltObjects;
      beforeEach(() => {
        _constructionCount = 0;
      });

      function expectDirectives(query, type, expectedIndex) {
        var currentCount = 0;
        iterateListLike(query, (i) => {
          expect(i).toBeAnInstanceOf(type);
          expect(i.count).toBe(expectedIndex[currentCount]);
          currentCount += 1;
        });
      }

      it('should be injectable', () => {
        var inj = injector([NeedsQuery], null, false, preBuildObjects);
        expect(inj.get(NeedsQuery).query).toBeAnInstanceOf(QueryList);
      });

      it('should contain directives on the same injector', () => {
        var inj = injector([NeedsQuery, CountingDirective], null, false, preBuildObjects);

        expectDirectives(inj.get(NeedsQuery).query, CountingDirective, [0]);
      });

      // Dart's restriction on static types in (a is A) makes this feature hard to implement.
      // Current proposal is to add second parameter the Query constructor to take a
      // comparison function to support user-defined definition of matching.

      //it('should support super class directives', () => {
      //  var inj = injector([NeedsQuery, FancyCountingDirective], null, null, preBuildObjects);
      //
      //  expectDirectives(inj.get(NeedsQuery).query, FancyCountingDirective, [0]);
      //});

      it('should contain directives on the same and a child injector in construction order', () => {
        var protoParent = createPei(null, 0, [NeedsQuery, CountingDirective]);
        var protoChild = createPei(protoParent, 1, [CountingDirective]);

        var parent = protoParent.instantiate(null);
        var child = protoChild.instantiate(parent);
        parent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);

        expectDirectives(parent.get(NeedsQuery).query, CountingDirective, [0,1]);
      });

      it('should reflect unlinking an injector', () => {
        var protoParent = createPei(null, 0, [NeedsQuery, CountingDirective]);
        var protoChild = createPei(protoParent, 1, [CountingDirective]);

        var parent = protoParent.instantiate(null);
        var child = protoChild.instantiate(parent);
        parent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);

        child.unlink();

        expectDirectives(parent.get(NeedsQuery).query, CountingDirective, [0]);
      });

      it('should reflect moving an injector as a last child', () => {
        var protoParent = createPei(null, 0, [NeedsQuery, CountingDirective]);
        var protoChild1 = createPei(protoParent, 1, [CountingDirective]);
        var protoChild2 = createPei(protoParent, 1, [CountingDirective]);

        var parent = protoParent.instantiate(null);
        var child1 = protoChild1.instantiate(parent);
        var child2 = protoChild2.instantiate(parent);

        parent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child1.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child2.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);

        child1.unlink();
        child1.link(parent);

        var queryList = parent.get(NeedsQuery).query;
        expectDirectives(queryList, CountingDirective, [0, 2, 1]);
      });

      it('should reflect moving an injector as a first child', () => {
        var protoParent = createPei(null, 0, [NeedsQuery, CountingDirective]);
        var protoChild1 = createPei(protoParent, 1, [CountingDirective]);
        var protoChild2 = createPei(protoParent, 1, [CountingDirective]);

        var parent = protoParent.instantiate(null);
        var child1 = protoChild1.instantiate(parent);
        var child2 = protoChild2.instantiate(parent);

        parent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child1.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child2.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);

        child2.unlink();
        child2.linkAfter(parent, null);

        var queryList = parent.get(NeedsQuery).query;
        expectDirectives(queryList, CountingDirective, [0, 2, 1]);
      });

      it('should support two concurrent queries for the same directive', () => {
        var protoGrandParent = createPei(null, 0, [NeedsQuery]);
        var protoParent = createPei(null, 0, [NeedsQuery]);
        var protoChild = createPei(protoParent, 1, [CountingDirective]);

        var grandParent = protoGrandParent.instantiate(null);
        var parent = protoParent.instantiate(grandParent);
        var child = protoChild.instantiate(parent);

        grandParent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        parent.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);
        child.hydrate(Injector.resolveAndCreate([]), null, preBuildObjects);

        var queryList1 = grandParent.get(NeedsQuery).query;
        var queryList2 = parent.get(NeedsQuery).query;

        expectDirectives(queryList1, CountingDirective, [0]);
        expectDirectives(queryList2, CountingDirective, [0]);

        child.unlink();
        expectDirectives(queryList1, CountingDirective, []);
        expectDirectives(queryList2, CountingDirective, []);
      });
    });
  });
}

class ContextWithHandler {
  handler;
  constructor(handler) {
    this.handler = handler;
  }
}

class FakeRenderer extends Renderer {
  log:List;
  constructor() {
    super();
    this.log = [];
  }
  setElementProperty(viewRef, elementIndex, propertyName, value) {
    ListWrapper.push(this.log, [viewRef, elementIndex, propertyName, value]);
  }

}
