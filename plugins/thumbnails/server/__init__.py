#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright Kitware Inc.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################

from girder import events
from girder.api.rest import getApiUrl
from girder.constants import AccessType
from girder.utility.model_importer import ModelImporter
from . import rest


def removeThumbnails(event):
    """
    When a resource containing thumbnails is about to be deleted, we delete
    all of the thumbnails that are attached to it.
    """
    thumbs = event.info.get('_thumbnails', ())
    fileModel = ModelImporter.model('file')

    for fileId in thumbs:
        file = fileModel.load(fileId, force=True)
        if file:
            fileModel.remove(file)


def removeThumbnailLink(event):
    """
    When a thumbnail file is deleted, we remove the reference to it from the
    resource to which it is attached.
    """
    doc = event.info

    if doc.get('isThumbnail'):
        model = ModelImporter.model(doc['attachedToType'])
        resource = model.load(doc['attachedToId'], force=True)

        if doc['_id'] in resource.get('_thumbnails', ()):
            resource['_thumbnails'].remove(doc['_id'])
            model.save(resource, validate=False)


def scheduleThumbnail(event):
    kwargs = event.info['kwargs']
    user = event.info['user']

    fileModel = ModelImporter.model('file')
    tokenModel = ModelImporter.model('token')

    fileId = kwargs['fileId']

    file = fileModel.load(fileId, user=user, level=AccessType.READ)

    if 'dcm' in file['exts'] or 'dicom' in file['exts']:
        from pprint import pprint as pp ; pp(file)

        token = tokenModel.createToken(user=user)

        response = kwargs.copy()
        response.update({
            'handler': 'romanesco_handler',
            'args': [],
            'kwargs': {
                'cleanup': True,
                'inputs': {
                    'dicom_file': {
                        'headers': {'Girder-Token': token},

                        'method': 'GET',
                        'mode': 'http',
                        'url': '%s/file/%s/download' % (getApiUrl(), fileId)
                    }
                },

                'outputs': {
                    'output_image': {
                        'format': 'jpeg',
                        'method': 'POST',
                        'mode': 'http',
                        'type': 'image',
                        'url': ''.join((
                            '%s/dicom_thumbnailer/recv?',
                            'attachId=%s&attachType=item&fileId=%s')) % (
                                getApiUrl(), attachToId, fileId)
                    }
                },

                'script': '\n'.join(('',
                                     'from pprint import pprint as pp'
                                     '',
                                     '',
                                     'print "Helloooooo"'
                                     'pp(dicom_file)',
                                     'pp(locals())',
                                     'pp(globals())',
                                     '',
                                     ''))

                'task': {
                    'inputs': [
                        {
                            'format': 'text',
                            'id': 'dicom_file',
                            'target': 'filepath',
                            'type': 'string'
                        },
                        {
                            'data': 128,
                            'format': 'object',
                            'id': 'width',
                            'type': 'python'
                        },
                        {
                            'data': 0,
                            'format': 'object',
                            'id': 'height',
                            'type': 'python'
                        }
                    ],

                    'mode': 'python',
                    'name': 'Dicom Thumbnailer',
                    'outputs': [
                        {
                            'format': 'pil',
                            'id': 'output_image',
                            'target': 'memory',
                            'type': 'image'
                        }
                    ]
                }
            }
        })

        event.addResponse(response)


def load(info):
    info['apiRoot'].thumbnail = rest.Thumbnail()

    for model in ('item', 'collection', 'folder', 'user'):
        ModelImporter.model(model).exposeFields(
            level=AccessType.READ, fields='_thumbnails')

        events.bind('model.%s.remove' % model, 'thumbnails', removeThumbnails)

    events.bind('model.file.remove', 'thumbnails', removeThumbnailLink)
    events.bind('thumbnail.schedule', 'thumbnails', scheduleThumbnail)

