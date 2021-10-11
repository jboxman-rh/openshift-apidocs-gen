const { describe } = require('riteway');

const {
  flattenProps
} = require('../lib/properties');

// TODO - process multiple specs from the same file
// to watch the deep clone / reference problem of modifying definitions

describe('flattenProps', async assert => {

  {
    const { definitions } = require('./specs/prometheus-spec.json');
    const testSpec = definitions['com.coreos.monitoring.v1.Prometheus'];

    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'Prometheus spec';

    assert({
      given,
      should: 'recurse all keys',
      actual: Object.keys(flatProps).length,
      expected: 1051
    });

    // A string or integer must not be explicitly named
    /*
    "portals": {
      "description": "iSCSI Target Portal List...",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    */

    assert({
      given,
      should: 'not recognize `.spec.volumes[].iscsi.portals` as array of objects',
      actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals{}'),
      expected: false
    });

    assert({
      given,
      should: 'not recognize `.spec.volumes[].iscsi.portals` as an array of arrays',
      actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals[]'),
      expected: false
    });

    assert({
      given,
      should: 'recognize `.spec.volumes[].iscsi.portals` property as without complex child',
      actual: flatProps.hasOwnProperty('.spec.volumes[].iscsi.portals'),
      expected: true
    });

    assert({
      given,
      should: 'copy description from $ref as string',
      actual: typeof flatProps['.metadata.annotations'].description,
      expected: 'string'
    });


    assert({
      given,
      should: 'copy description from $ref',
      actual: (flatProps['.metadata.annotations'].description || '').length > 0,
      expected: true
    });

    assert({
      given,
      should: 'recognize object of strings',
      actual: flatProps['.metadata.annotations'].type,
      expected: 'object (string)'
    });
  }

  {
    const { definitions } = require('./specs/storageclass-spec.json');
    const testSpec = definitions['io.k8s.api.storage.v1.StorageClass'];

    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'StorageClass spec';

    assert({
      given,
      should: 'recurse all keys',
      actual: Object.keys(flatProps).length,
      expected: 46
    });
  }

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.Image'];

    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'Image spec';

    assert({
      given,
      should: 'recurse all keys',
      actual: Object.keys(flatProps).length,
      expected: 101
    });

    // parent must be an array
    assert({
      given,
      should: 'recognize `.signatures[].conditions` as an array',
      actual: flatProps['.signatures[].conditions']['type'],
      expected: 'array'
    });

    // child must be an object
    assert({
      given,
      should: 'recognize `.signatures[].conditions[]` as an object',
      actual: flatProps['.signatures[].conditions[]']['type'],
      expected: 'object'
    });
  }

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];

    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'ImageStreamLayers spec';

    assert({
      given,
      should: 'recurse all keys',
      actual: Object.keys(flatProps).length,
      expected: 43
    });

    // Resolve additionalProperties $ref
    assert({
      given,
      should: 'recognize .blobs{}.* as object properties',
      actual: ['.blobs{}.size', '.blobs{}.mediaType'].every(prop => flatProps[prop]),
      expected: true
    });

    // Don't overwritten 'description' with 'description' from $ref
    assert({
      given,
      should: 'preserve `.blobs` description',
      actual: flatProps['.blobs']['description'],
      expected: 'blobs is a map of blob name to metadata about the blob.'
    });
  }

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];
    const flatProps = flattenProps({ data: testSpec, definitions, resolve: 'image.openshift.io' });

    const given = 'ImageStreamLayers spec scoped to image.openshift.io';

    assert({
      given,
      should: 'not resolve `.metadata`',
      actual: flatProps['.metadata']['$ref'],
      expected: '#/definitions/io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta'
    });
  }

  {
    const { definitions } = require('./specs/build-spec.json');
    const testSpec = definitions['com.github.openshift.api.build.v1.Build'];
    
    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'Build spec';

    assert({
      given,
      should: 'infer missing type object',
      actual: flatProps['.spec.strategy'].type == 'object',
      expected: true
    });

    assert({
      given,
      should: 'infer missing type object for child',
      actual: flatProps['.spec.triggeredBy[]'].type == 'object',
      expected: true
    });
  }

  {
    const { definitions } = require('./specs/crd-spec.json');
    const testSpec = definitions['io.k8s.apiextensions-apiserver.pkg.apis.apiextensions.v1.CustomResourceDefinition'];
    
    const flatProps = flattenProps({ data: testSpec, definitions });

    const given = 'CustomResourceDefinition spec';

    // Avoid infinite recursion for this CRD
    assert({
      given, 
      should: 'recurse all keys',
      actual: Object.keys(flatProps).length,
      expected: 64
    });
  }

});

describe('relatedSpecs', async assert => {
  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageStreamLayers'];

    const flatProps = flattenProps({ data: testSpec, definitions, resolve: false });

    // TODO - import function
    const actual = Object.entries(flatProps).reduce((accum, entry) => {
      if(entry[1].hasOwnProperty('$ref')) {
        accum.push(entry[1]['$ref']);
      }
      return accum;
    }, []);

    assert({
      given: 'ImageStreamLayers spec with unresolved $refs',
      should: 'resolve $ref for each property',
      actual,
      expected: [
        '#/definitions/com.github.openshift.api.image.v1.ImageLayerData',
        '#/definitions/com.github.openshift.api.image.v1.ImageBlobReferences',
        '#/definitions/io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta'
      ]
    });

  }
});

describe('resolveRef', async assert => {
  const resolveRef = flattenProps.resolveRef;

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.Image'];

    assert({
      given: 'data without `$ref`', 
      should: 'ignore data without `$ref`',
      actual: resolveRef({ data: testSpec, definitions, resolve: 'com.github.openshift.api.image.v1.Image' }),
      expected: testSpec
    });

    assert({
      given: 'data with `$ref` in specified group', 
      should: 'resolve `$ref` for specified group',
      actual: Object.keys(resolveRef({ data: testSpec.properties.dockerImageLayers.items, definitions, resolve: 'com.github.openshift.api.image.v1.Image' }).properties),
      expected: ['mediaType', 'name', 'size']
    });

    assert({
      given: 'data with `$ref` not in specified group', 
      should: 'not resolve `$ref`',
      actual: !!resolveRef({ data: testSpec.properties.metadata, definitions, resolve: 'com.github.openshift.api.image.v1.Image' })['$ref'],
      expected: true
    });

  }

  {
    const { definitions } = require('./specs/image-spec.json');
    const testSpec = definitions['com.github.openshift.api.image.v1.ImageImportSpec'];

    assert({
      given: 'data with `$ref` in core group not matching /(Spec|Status)$/', 
      should: 'not resolve `$ref`',
      actual: !!resolveRef({ data: testSpec.properties.from, definitions, resolve: 'com.github.openshift.api.image.v1.ImageImportSpec' })['$ref'],
      expected: true
    });

  }

  {
    const { definitions } = require('./specs/service-spec.json');
    const testSpec = definitions['io.k8s.api.core.v1.Service'];

    assert({
      given: 'data with `$ref` in core group matching /(Spec|Status)$/', 
      should: 'resolve `$ref`',
      actual: resolveRef({ data: testSpec.properties.spec, definitions, resolve: 'io.k8s.api.core.v1.Service' }).description,
      expected: 'ServiceSpec describes the attributes that a user creates on a service.'
    });

  }

});
